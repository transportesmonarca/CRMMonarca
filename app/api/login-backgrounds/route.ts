import { NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { type LoginBackground, type LoginMoment } from "@/lib/login-images"

export const dynamic = "force-dynamic"

const VALID_MOMENTS: readonly LoginMoment[] = ["day", "evening", "night"]

function isValidMoment(value: unknown): value is LoginMoment {
    return typeof value === "string" && (VALID_MOMENTS as readonly string[]).includes(value)
}

async function deleteBlobIfPossible(pathname?: string | null): Promise<void> {
    if (!pathname) return

    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
        console.warn("No BLOB_READ_WRITE_TOKEN available, skipping blob deletion for", pathname)
        return
    }

    try {
        await del(pathname, { token })
    } catch (error) {
        console.error("No se pudo eliminar el archivo del blob storage:", error)
    }
}

export async function GET(): Promise<NextResponse> {
    try {
        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from("login_backgrounds")
            .select("*")
            .order("moment", { ascending: true })
            .order("created_at", { ascending: false })

        if (error) {
            // Si la tabla aún no existe, regresamos arreglo vacío para mantener compatibilidad.
            if ((error as any)?.code === "42P01") {
                return NextResponse.json({ data: [] })
            }
            console.error("Error al consultar login_backgrounds:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data: data ?? [] })
    } catch (error: any) {
        console.error("Error inesperado al obtener las imágenes de login:", error)
        return NextResponse.json({ error: "Error inesperado al obtener las imágenes" }, { status: 500 })
    }
}

interface PostPayload {
    moment?: LoginMoment
    url?: string
    pathname?: string
    uploaded_by?: string | null
}

interface PatchPayload {
    id?: string
    moment?: LoginMoment
    url?: string
    pathname?: string
}

interface DeletePayload {
    id?: string
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = (await request.json()) as PostPayload
        const { moment, url, pathname, uploaded_by } = body

        if (!isValidMoment(moment)) {
            return NextResponse.json(
                { error: "Momento inválido. Usa 'day', 'evening' o 'night'." },
                { status: 400 },
            )
        }
        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "Falta la URL pública del archivo" }, { status: 400 })
        }
        if (!pathname || typeof pathname !== "string") {
            return NextResponse.json({ error: "Falta el pathname del archivo en Blob" }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase
            .from("login_backgrounds")
            .insert({
                moment,
                url,
                pathname,
                uploaded_by: uploaded_by ?? null,
            })
            .select("*")
            .single()

        if (error) {
            console.error("Error al insertar login_background:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error("Error inesperado al guardar imagen de login:", error)
        const message =
            error instanceof SyntaxError
                ? "JSON inválido en la solicitud"
                : error?.message || "Error inesperado al guardar la imagen"
        const status = error instanceof SyntaxError ? 400 : 500
        return NextResponse.json({ error: message }, { status })
    }
}

export async function PATCH(request: Request): Promise<NextResponse> {
    try {
        const body = (await request.json()) as PatchPayload
        const { id, moment, url, pathname } = body

        if (!id || typeof id !== "string") {
            return NextResponse.json({ error: "Falta el id de la imagen a actualizar" }, { status: 400 })
        }

        if (moment !== undefined && !isValidMoment(moment)) {
            return NextResponse.json(
                { error: "Momento inválido. Usa 'day', 'evening' o 'night'." },
                { status: 400 },
            )
        }

        const replacingFile = url !== undefined || pathname !== undefined
        if (replacingFile) {
            if (!url || typeof url !== "string") {
                return NextResponse.json({ error: "Falta la URL pública del archivo" }, { status: 400 })
            }
            if (!pathname || typeof pathname !== "string") {
                return NextResponse.json({ error: "Falta el pathname del archivo en Blob" }, { status: 400 })
            }
        }

        const supabase = getSupabaseAdmin()
        const { data: current, error: fetchError } = await supabase
            .from("login_backgrounds")
            .select("*")
            .eq("id", id)
            .single<LoginBackground>()

        if (fetchError) {
            if ((fetchError as any)?.code === "PGRST116") {
                return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 })
            }
            console.error("Error al obtener imagen de login para actualizar:", fetchError)
            return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        if (!current) {
            return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 })
        }

        const updates: Record<string, unknown> = {}
        if (moment !== undefined) {
            updates.moment = moment
        }
        if (replacingFile && url && pathname) {
            updates.url = url
            updates.pathname = pathname
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ data: current })
        }

        updates.created_at = new Date().toISOString()

        const { data, error } = await supabase
            .from("login_backgrounds")
            .update(updates)
            .eq("id", id)
            .select("*")
            .single<LoginBackground>()

        if (error) {
            console.error("Error al actualizar login_background:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (replacingFile && current.pathname && current.pathname !== pathname) {
            await deleteBlobIfPossible(current.pathname)
        }

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error("Error inesperado al actualizar imagen de login:", error)
        const message =
            error instanceof SyntaxError
                ? "JSON inválido en la solicitud"
                : error?.message || "Error inesperado al actualizar la imagen"
        const status = error instanceof SyntaxError ? 400 : 500
        return NextResponse.json({ error: message }, { status })
    }
}

export async function DELETE(request: Request): Promise<NextResponse> {
    try {
        let id: string | null = null

        const contentType = request.headers.get("content-type")
        if (contentType?.includes("application/json")) {
            try {
                const body = (await request.json()) as DeletePayload
                if (body?.id && typeof body.id === "string") {
                    id = body.id
                }
            } catch (parseError) {
                console.warn("No se pudo parsear el cuerpo del DELETE de login_backgrounds:", parseError)
            }
        }

        if (!id) {
            const { searchParams } = new URL(request.url)
            id = searchParams.get("id")
        }

        if (!id) {
            return NextResponse.json({ error: "Falta el id de la imagen a eliminar" }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()
        const { data: current, error: fetchError } = await supabase
            .from("login_backgrounds")
            .select("*")
            .eq("id", id)
            .single<LoginBackground>()

        if (fetchError) {
            if ((fetchError as any)?.code === "PGRST116") {
                return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 })
            }
            console.error("Error al buscar imagen de login para eliminar:", fetchError)
            return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        if (!current) {
            return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 })
        }

        const { error } = await supabase.from("login_backgrounds").delete().eq("id", id)
        if (error) {
            console.error("Error al eliminar login_background:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        await deleteBlobIfPossible(current.pathname)

        return NextResponse.json({ data: { id } })
    } catch (error: any) {
        console.error("Error inesperado al eliminar imagen de login:", error)
        return NextResponse.json({ error: error?.message || "Error inesperado al eliminar la imagen" }, { status: 500 })
    }
}
"use client"

import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Pencil, RefreshCw, Trash2, UploadCloud } from "lucide-react"
import { uploadFile } from "@/lib/blob"
import {
    type LoginBackground,
    type LoginMoment,
    LOGIN_MOMENTS,
    groupLoginBackgrounds,
    createEmptyLoginBackgroundMap,
} from "@/lib/login-images"
import { useToast } from "@/hooks/use-toast"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB, consistente con la validación del endpoint

const MOMENT_DETAILS: Record<LoginMoment, { label: string; timeframe: string; helper: string }> = {
    day: {
        label: "Día",
        timeframe: "06:00 a 17:59",
        helper: "Utiliza imágenes luminosas o rutas con luz natural.",
    },
    evening: {
        label: "Tarde",
        timeframe: "18:00 a 20:59",
        helper: "Recomendadas imágenes con tonos cálidos del atardecer.",
    },
    night: {
        label: "Noche",
        timeframe: "21:00 a 05:59",
        helper: "Ideal para fotografías nocturnas o luces de carretera.",
    },
}

function formatUploadDate(isoString?: string | null): string {
    if (!isoString) return "Reciente"
    const parsed = new Date(isoString)
    if (Number.isNaN(parsed.getTime())) return "Reciente"
    return parsed.toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
    })
}

function createTargetPath(moment: LoginMoment, file: File): string {
    const safeName = file.name.replace(/[^a-zA-Z0-9.]+/g, "-")
    return `login-backgrounds/${moment}/${Date.now()}-${safeName}`
}

function isLoginMomentValue(value: string): value is LoginMoment {
    return (LOGIN_MOMENTS as readonly string[]).includes(value as LoginMoment)
}

type BackgroundMap = Record<LoginMoment, LoginBackground[]>

export default function LoginBackgroundManager() {
    const [backgrounds, setBackgrounds] = useState<BackgroundMap>(() => createEmptyLoginBackgroundMap())
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [uploadingMoment, setUploadingMoment] = useState<LoginMoment | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [recentlyChanged, setRecentlyChanged] = useState<{ id: string; label: string } | null>(null)
    const [editingBackground, setEditingBackground] = useState<LoginBackground | null>(null)
    const [editMoment, setEditMoment] = useState<LoginMoment>("day")
    const [editFile, setEditFile] = useState<File | null>(null)
    const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null)
    const [savingEdit, setSavingEdit] = useState(false)
    const [deleteCandidate, setDeleteCandidate] = useState<LoginBackground | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const { toast } = useToast()

    const fileInputs: Record<LoginMoment, RefObject<HTMLInputElement>> = {
        day: useRef<HTMLInputElement>(null),
        evening: useRef<HTMLInputElement>(null),
        night: useRef<HTMLInputElement>(null),
    }
    const editFileInput = useRef<HTMLInputElement>(null)

    useEffect(() => {
        void fetchBackgrounds()
    }, [])

    useEffect(() => {
        return () => {
            if (editPreviewUrl) {
                URL.revokeObjectURL(editPreviewUrl)
            }
        }
    }, [editPreviewUrl])

    const totalImages = useMemo(
        () => backgrounds.day.length + backgrounds.evening.length + backgrounds.night.length,
        [backgrounds],
    )

    async function fetchBackgrounds(isRefresh = false) {
        setErrorMessage(null)
        if (isRefresh) {
            setRefreshing(true)
        } else {
            setLoading(true)
        }

        try {
            const response = await fetch("/api/login-backgrounds", { cache: "no-store" })
            if (!response.ok) {
                throw new Error(`Error ${response.status}`)
            }
            const payload = await response.json()
            const records = Array.isArray(payload?.data) ? (payload.data as LoginBackground[]) : []
            setBackgrounds(groupLoginBackgrounds(records))
            setRecentlyChanged(null)
        } catch (error: any) {
            console.error("Error al cargar imágenes de login:", error)
            const friendly =
                error?.message === "Failed to fetch"
                    ? "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente."
                    : "No se pudieron obtener las imágenes cargadas. Se usarán las predeterminadas hasta que subas nuevas fotos."
            setErrorMessage(friendly)
            toast({
                title: "No se pudieron cargar las imágenes",
                description: friendly,
                variant: "destructive",
            })
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    async function handleFileChange(moment: LoginMoment, fileList: FileList | null) {
        const file = fileList?.[0]
        if (!file) return

        if (!file.type.startsWith("image/")) {
            toast({
                title: "Tipo de archivo no permitido",
                description: "Selecciona una imagen (JPG, PNG, GIF, BMP o WebP)",
                variant: "destructive",
            })
            fileInputs[moment].current && (fileInputs[moment].current.value = "")
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: "La imagen es muy pesada",
                description: "El tamaño máximo permitido es de 10MB",
                variant: "destructive",
            })
            fileInputs[moment].current && (fileInputs[moment].current.value = "")
            return
        }

        setUploadingMoment(moment)
        setRecentlyChanged(null)

        const tempId = `temp-${Date.now()}`
        const previewUrl = URL.createObjectURL(file)

        setBackgrounds((prev) => ({
            ...prev,
            [moment]: [
                {
                    id: tempId,
                    moment,
                    url: previewUrl,
                    pathname: "",
                    created_at: new Date().toISOString(),
                    is_temp: true,
                } as LoginBackground,
                ...prev[moment],
            ],
        }))

        try {
            const targetName = createTargetPath(moment, file)
            const { url, pathname } = await uploadFile(targetName, file)

            const response = await fetch("/api/login-backgrounds", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ moment, url, pathname }),
            })

            if (!response.ok) {
                const text = await response.text()
                throw new Error(text || `Error ${response.status}`)
            }

            const payload = await response.json()
            const inserted = payload?.data as LoginBackground | undefined
            if (!inserted) {
                throw new Error("La API no devolvió la información de la imagen creada")
            }

            setBackgrounds((prev) => ({
                ...prev,
                [moment]: prev[moment].map((item) => (item.id === tempId ? inserted : item)),
            }))
            setRecentlyChanged({ id: inserted.id, label: "Nueva" })
            toast({
                title: "Imagen cargada",
                description: "La pantalla de login usará esta imagen en el horario correspondiente.",
            })
        } catch (error: any) {
            console.error("Error al subir imagen de login:", error)
            setBackgrounds((prev) => ({
                ...prev,
                [moment]: prev[moment].filter((item) => item.id !== tempId),
            }))
            toast({
                title: "No se pudo subir la imagen",
                description: error?.message || "Intenta nuevamente más tarde.",
                variant: "destructive",
            })
        } finally {
            setUploadingMoment(null)
            URL.revokeObjectURL(previewUrl)
            if (fileInputs[moment].current) {
                fileInputs[moment].current!.value = ""
            }
        }
    }

    function resetEditState() {
        if (editPreviewUrl) {
            URL.revokeObjectURL(editPreviewUrl)
        }
        setEditPreviewUrl(null)
        setEditFile(null)
        if (editFileInput.current) {
            editFileInput.current.value = ""
        }
    }

    function handleOpenEdit(background: LoginBackground) {
        resetEditState()
        setEditingBackground(background)
        setEditMoment(background.moment)
    }

    function closeEditDialog() {
        resetEditState()
        setEditingBackground(null)
    }

    function handleEditFileChange(fileList: FileList | null) {
        const file = fileList?.[0]
        if (!file) return

        if (!file.type.startsWith("image/")) {
            toast({
                title: "Tipo de archivo no permitido",
                description: "Selecciona una imagen (JPG, PNG, GIF, BMP o WebP)",
                variant: "destructive",
            })
            if (editFileInput.current) {
                editFileInput.current.value = ""
            }
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: "La imagen es muy pesada",
                description: "El tamaño máximo permitido es de 10MB",
                variant: "destructive",
            })
            if (editFileInput.current) {
                editFileInput.current.value = ""
            }
            return
        }

        if (editPreviewUrl) {
            URL.revokeObjectURL(editPreviewUrl)
        }

        setEditFile(file)
        setEditPreviewUrl(URL.createObjectURL(file))
    }

    function clearSelectedEditFile() {
        if (editPreviewUrl) {
            URL.revokeObjectURL(editPreviewUrl)
        }
        setEditFile(null)
        setEditPreviewUrl(null)
        if (editFileInput.current) {
            editFileInput.current.value = ""
        }
    }

    async function handleSaveEdit() {
        if (!editingBackground) return

        if (!LOGIN_MOMENTS.includes(editMoment)) {
            toast({
                title: "Momento inválido",
                description: "Selecciona un momento válido del día.",
                variant: "destructive",
            })
            return
        }

        setSavingEdit(true)

        try {
            let nextUrl = editingBackground.url
            let nextPathname = editingBackground.pathname

            if (editFile) {
                const targetName = createTargetPath(editMoment, editFile)
                const { url, pathname } = await uploadFile(targetName, editFile)
                nextUrl = url
                nextPathname = pathname
            }

            const response = await fetch("/api/login-backgrounds", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: editingBackground.id,
                    moment: editMoment,
                    ...(editFile
                        ? {
                            url: nextUrl,
                            pathname: nextPathname,
                        }
                        : {}),
                }),
            })

            if (!response.ok) {
                const text = await response.text()
                throw new Error(text || `Error ${response.status}`)
            }

            const payload = await response.json()
            const updated = payload?.data as LoginBackground | undefined
            if (!updated) {
                throw new Error("La API no devolvió la información actualizada")
            }

            setBackgrounds((prev) => {
                const next: BackgroundMap = {
                    day: prev.day.filter((item) => item.id !== updated.id),
                    evening: prev.evening.filter((item) => item.id !== updated.id),
                    night: prev.night.filter((item) => item.id !== updated.id),
                }
                next[updated.moment] = [updated, ...next[updated.moment]]
                return next
            })

            setRecentlyChanged({ id: updated.id, label: "Actualizada" })
            toast({
                title: "Cambios guardados",
                description: "La imagen se actualizó correctamente.",
            })
            closeEditDialog()
        } catch (error: any) {
            console.error("Error al editar imagen de login:", error)
            toast({
                title: "No se pudieron guardar los cambios",
                description: error?.message || "Intenta nuevamente más tarde.",
                variant: "destructive",
            })
        } finally {
            setSavingEdit(false)
        }
    }

    function handleDeleteRequest(background: LoginBackground) {
        setDeleteCandidate(background)
    }

    async function confirmDelete() {
        if (!deleteCandidate) return

        setDeletingId(deleteCandidate.id)

        try {
            const response = await fetch("/api/login-backgrounds", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: deleteCandidate.id }),
            })

            if (!response.ok) {
                const text = await response.text()
                throw new Error(text || `Error ${response.status}`)
            }

            setBackgrounds((prev) => ({
                ...prev,
                [deleteCandidate.moment]: prev[deleteCandidate.moment].filter(
                    (item) => item.id !== deleteCandidate.id,
                ),
            }))

            setRecentlyChanged((previous) =>
                previous?.id === deleteCandidate.id ? null : previous,
            )

            toast({
                title: "Imagen eliminada",
                description: "Se utilizarán las imágenes restantes para este horario.",
            })

            setDeleteCandidate(null)
        } catch (error: any) {
            console.error("Error al eliminar imagen de login:", error)
            toast({
                title: "No se pudo eliminar la imagen",
                description: error?.message || "Intenta nuevamente más tarde.",
                variant: "destructive",
            })
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                            <UploadCloud className="h-5 w-5 text-amber-500" />
                            Fondos de la pantalla de login
                        </CardTitle>
                        <CardDescription>
                            Sube imágenes personalizadas para los diferentes momentos del día. Se mostrarán al instante al
                            completar la carga.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs">
                            {totalImages} {totalImages === 1 ? "imagen" : "imágenes"} cargadas
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchBackgrounds(true)}
                            disabled={refreshing}
                            type="button"
                        >
                            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Actualizar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {errorMessage && (
                        <Alert variant="destructive">
                            <AlertTitle>No se pudieron cargar todas las imágenes</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}

                    <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Las imágenes deben ser horizontales (ideal 1920x1080) y con peso máximo de 10MB. Después de subirlas se
                        verán de inmediato en esta lista y comenzarán a rotar en la pantalla de login según el horario indicado.
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-600">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            Cargando imágenes actuales…
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {(Object.keys(MOMENT_DETAILS) as LoginMoment[]).map((moment) => {
                                const items = backgrounds[moment] ?? []
                                const details = MOMENT_DETAILS[moment]
                                return (
                                    <div
                                        key={moment}
                                        className="rounded-lg border border-gray-200 bg-white shadow-sm"
                                    >
                                        <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
                                            <div>
                                                <h3 className="text-base font-semibold text-gray-900">{details.label}</h3>
                                                <p className="text-xs text-gray-500">{details.timeframe} · {details.helper}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => fileInputs[moment].current?.click()}
                                                    disabled={uploadingMoment === moment}
                                                    type="button"
                                                >
                                                    {uploadingMoment === moment ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <UploadCloud className="mr-2 h-4 w-4" />
                                                    )}
                                                    Subir
                                                </Button>
                                                <input
                                                    ref={fileInputs[moment]}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(event) => handleFileChange(moment, event.target.files)}
                                                />
                                                <Badge variant="secondary" className="text-[11px]">
                                                    {items.length} {items.length === 1 ? "imagen" : "imágenes"}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-4">
                                            {items.length === 0 ? (
                                                <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">
                                                    Aún no hay imágenes personalizadas. Se usarán las predeterminadas.
                                                </div>
                                            ) : (
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {items.map((item) => {
                                                        const highlight = recentlyChanged?.id === item.id
                                                        const isBusy =
                                                            deletingId === item.id ||
                                                            (savingEdit && editingBackground?.id === item.id)
                                                        const disableActions =
                                                            !!item.is_temp ||
                                                            uploadingMoment === moment ||
                                                            deletingId === item.id ||
                                                            (savingEdit && editingBackground?.id === item.id)

                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className={`group relative overflow-hidden rounded-md border ${highlight
                                                                        ? "border-amber-300 ring-2 ring-amber-400"
                                                                        : "border-gray-200"
                                                                    }`}
                                                            >
                                                                <img
                                                                    src={item.url}
                                                                    alt={`Fondo de login (${details.label})`}
                                                                    className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                />

                                                                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                                                    <Button
                                                                        variant="secondary"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() => handleOpenEdit(item)}
                                                                        disabled={disableActions}
                                                                        aria-label="Editar imagen"
                                                                        type="button"
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() => handleDeleteRequest(item)}
                                                                        disabled={disableActions}
                                                                        aria-label="Eliminar imagen"
                                                                        type="button"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>

                                                                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-2 py-1 text-[11px] text-white">
                                                                    <span className="truncate">{formatUploadDate(item.created_at)}</span>
                                                                    {highlight && recentlyChanged && (
                                                                        <span className="ml-2 rounded bg-amber-500/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                                                                            {recentlyChanged.label}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {item.is_temp && (
                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 text-xs text-gray-700">
                                                                        <Loader2 className="mb-2 h-4 w-4 animate-spin" />
                                                                        Subiendo…
                                                                    </div>
                                                                )}

                                                                {isBusy && (
                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 text-xs text-gray-700">
                                                                        <Loader2 className="mb-2 h-4 w-4 animate-spin" />
                                                                        {deletingId === item.id ? "Eliminando…" : "Guardando…"}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={Boolean(editingBackground)}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditDialog()
                    }
                }}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Editar imagen seleccionada</DialogTitle>
                        <DialogDescription>
                            Ajusta el momento del día o reemplaza la imagen. Los cambios se reflejarán en la pantalla de login.
                        </DialogDescription>
                    </DialogHeader>

                    {editingBackground && (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">Vista previa</p>
                                <div className="relative overflow-hidden rounded-md border">
                                    {editPreviewUrl || editingBackground.url ? (
                                        <img
                                            src={editPreviewUrl ?? editingBackground.url}
                                            alt="Vista previa de la imagen de login"
                                            className="h-40 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-40 items-center justify-center bg-gray-100 text-xs text-gray-500">
                                            Selecciona una imagen para visualizarla.
                                        </div>
                                    )}
                                    {editFile && (
                                        <span className="absolute left-2 top-2 rounded bg-amber-500/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                                            Vista previa
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">Momento del día</p>
                                <Select
                                    value={editMoment}
                                    onValueChange={(value) => {
                                        if (isLoginMomentValue(value)) {
                                            setEditMoment(value)
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecciona un momento" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LOGIN_MOMENTS.map((momentOption) => (
                                            <SelectItem key={momentOption} value={momentOption}>
                                                {MOMENT_DETAILS[momentOption].label} · {MOMENT_DETAILS[momentOption].timeframe}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">Imagen</p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => editFileInput.current?.click()}
                                        disabled={savingEdit}
                                        type="button"
                                    >
                                        <UploadCloud className="mr-2 h-4 w-4" />
                                        {editFile ? "Reemplazar imagen" : "Seleccionar nueva imagen"}
                                    </Button>
                                    {editFile && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearSelectedEditFile}
                                            disabled={savingEdit}
                                            type="button"
                                        >
                                            Quitar selección
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    Si no eliges una nueva imagen se conservará la actual. Formatos permitidos: JPG, PNG, GIF, BMP o WebP
                                    de hasta 10MB.
                                </p>
                                <input
                                    ref={editFileInput}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(event) => handleEditFileChange(event.target.files)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={closeEditDialog} disabled={savingEdit} type="button">
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={savingEdit} type="button">
                            {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Guardar cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={Boolean(deleteCandidate)}
                onOpenChange={(open) => {
                    if (!open && !deletingId) {
                        setDeleteCandidate(null)
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar esta imagen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteCandidate ? (
                                <>
                                    Esta acción quitará la imagen asignada al horario de
                                    {" "}
                                    <span className="font-semibold text-gray-900">
                                        {MOMENT_DETAILS[deleteCandidate.moment].label.toLowerCase()}
                                    </span>
                                    . Podrás subir otra imagen más adelante.
                                </>
                            ) : (
                                "Esta acción quitará la imagen seleccionada y la pantalla de login volverá a usar las restantes para el horario correspondiente."
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingId !== null}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault()
                                void confirmDelete()
                            }}
                            disabled={deletingId !== null}
                        >
                            {deletingId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
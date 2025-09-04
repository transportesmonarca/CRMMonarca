import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pathname = url.searchParams.get("pathname");
    if (!pathname) return NextResponse.json({ error: "missing pathname" }, { status: 400 });

    // Algunos clientes envían pathname ya codificado (encodeURIComponent).
    // Decodificar para recuperar barras '/' correctamente.
    let decodedPathname = pathname
    try {
      decodedPathname = decodeURIComponent(pathname)
    } catch (e) {
      // si decode falla, seguir con el valor original
      decodedPathname = pathname
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("BLOB_READ_WRITE_TOKEN not set - cannot proxy blob");
      return NextResponse.json({ error: "blob token not configured" }, { status: 500 });
    }

    // Normalizar pathname: asegurarnos que no tenga slashes iniciales
  const normalizedPath = String(decodedPathname).replace(/^\/+/, "");

    // Vercel Blob direct URL: https://blob.vercel-storage.com/{pathname}
    // Importante: NO usar encodeURIComponent sobre todo el pathname, porque
    // eso convierte las barras ('/') en '%2F' y produce "not found".
    const blobUrl = `https://blob.vercel-storage.com/${normalizedPath}`;

    console.log("Proxying blob request for:", normalizedPath, "->", blobUrl);

    const resp = await fetch(blobUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Error fetching blob:", resp.status, text);
      // Hacer mensaje un poco más amable para el cliente
      const message = resp.status === 404 ? "Blob not found" : "Error fetching blob";
      return NextResponse.json({ error: message, details: text }, { status: resp.status });
    }

    const contentType = resp.headers.get("content-type") || "application/octet-stream";
    const body = resp.body;
    return new NextResponse(body, { headers: { "Content-Type": contentType } });
  } catch (error: any) {
    console.error("blob-proxy error:", error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}

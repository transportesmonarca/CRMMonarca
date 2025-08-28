export async function checkBlobConfiguration(): Promise<boolean> {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function getBlobToken(): Promise<string | undefined> {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export async function testBlobConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return { success: false, message: "Token de Vercel Blob no configurado" };
    }
    const { list } = await import("@vercel/blob");
    await list({ limit: 1, token });
    return { success: true, message: "Vercel Blob configurado correctamente" };
  } catch (error) {
    return {
      success: false,
      message: `Error de configuración: ${error instanceof Error ? error.message : "Error desconocido"
        }`,
    };
  }
}
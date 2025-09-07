import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// Endpoint para restaurar la copia de seguridad de app/remolques/page.tsx
// Requiere POST con body { token: string } y el token debe coincidir con RESTORE_REMOLES_TOKEN env var.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body?.token;
    if (!token || token !== process.env.RESTORE_REMOLQUES_TOKEN) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const repoRoot = process.cwd();
    const backupPath = path.join(repoRoot, 'scripts', 'backups', 'remolques.page.tsx.backup');
    const targetPath = path.join(repoRoot, 'app', 'remolques', 'page.tsx');

    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ success: false, message: 'Backup not found' }, { status: 404 });
    }

    const content = fs.readFileSync(backupPath, 'utf-8');
    fs.writeFileSync(targetPath, content, 'utf-8');

    return NextResponse.json({ success: true, message: 'Remolques page restored from backup' });
  } catch (error) {
    // Avoid leaking internals
    return NextResponse.json({ success: false, message: 'Restore failed' }, { status: 500 });
  }
}

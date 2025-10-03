import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
    }
    
    console.log(`🗑️ API: Iniciando eliminación física del usuario ID: ${userId}`)
    
    // Usar cliente admin para operaciones con permisos completos
    const adminClient = getSupabaseAdmin()
    
    // Obtener información del usuario antes de eliminarlo
    const { data: userToDelete, error: selectError } = await adminClient
      .from("app_users")
      .select("id, username, nombre")
      .eq("id", userId)
      .single()
      
    if (selectError) {
      console.error("❌ API: Error obteniendo usuario antes de eliminar:", selectError)
      return NextResponse.json({ error: 'Usuario no encontrado', details: selectError }, { status: 404 })
    }
    
    if (!userToDelete) {
      console.error("❌ API: Usuario no encontrado para eliminar:", userId)
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    
    console.log(`📋 API: Usuario a eliminar: ${userToDelete.username} (${userToDelete.nombre})`)
    
    // Realizar eliminación física con cliente admin
    const { error } = await adminClient.from("app_users").delete().eq("id", userId)
    if (error) {
      console.error("❌ API: Error eliminando usuario de la base de datos:", error)
      return NextResponse.json({ error: 'Error eliminando usuario', details: error }, { status: 500 })
    }
    
    console.log(`✅ API: Usuario ${userToDelete.username} eliminado físicamente de la base de datos`)

    // Verificar que realmente se eliminó
    const { data: checkDeleted, error: checkError } = await adminClient
      .from("app_users")
      .select("id")
      .eq("id", userId)
      
    if (checkError) {
      console.warn("⚠️ API: Error verificando eliminación:", checkError)
    } else if (checkDeleted && checkDeleted.length > 0) {
      console.error("❌ API: Usuario todavía existe después de eliminación:", checkDeleted)
      return NextResponse.json({ error: 'Error: Usuario no se eliminó correctamente' }, { status: 500 })
    } else {
      console.log("✅ API: Confirmado - Usuario eliminado exitosamente")
    }

    // Intentar agregar registro de auditoría de borrado
    try {
      await adminClient.from("audit_logs").insert({
        usuario: "Sistema", // En API no tenemos acceso directo al currentUser
        accion: "ELIMINAR",
        modulo: "Seguridad",
        detalles: `Usuario eliminado físicamente: ${userToDelete.username} (${userToDelete.nombre})`,
        fecha_creacion: new Date().toISOString(),
      })
      console.log(`📝 API: Registro de auditoría creado para eliminación de ${userToDelete.username}`)
    } catch (e) {
      console.warn("⚠️ API: No se pudo anotar audit log de deleteUser:", e)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Usuario ${userToDelete.username} eliminado exitosamente`,
      deletedUser: {
        id: userToDelete.id,
        username: userToDelete.username,
        nombre: userToDelete.nombre
      }
    })
    
  } catch (error) {
    console.error("💥 API: Error general en eliminación de usuario:", error)
    return NextResponse.json({ error: 'Error interno del servidor', details: error }, { status: 500 })
  }
}
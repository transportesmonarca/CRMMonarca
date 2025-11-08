# Implementación: Subida de Documentos en Embarques

## Resumen
Agregar funcionalidad para subir hasta 10 documentos/imágenes al crear o editar un embarque, similar a como funciona con los documentos de operadores.

## Archivos Creados

### 1. SQL: EJECUTAR-EN-SUPABASE-documentos-embarques.sql
✅ Ya creado - Ejecutar en el SQL Editor de Supabase para crear la tabla `documentos_embarques`

### 2. Funciones en lib/blob.ts
✅ Ya agregadas:
- `subirDocumentoEmbarque(embarqueId, file)` - Sube un documento
- `eliminarDocumentoEmbarque(pathname)` - Elimina un documento
- `listarDocumentosEmbarque(embarqueId)` - Lista documentos de un embarque

## Cambios Pendientes en app/embarques/page.tsx

### 1. Agregar Imports
```typescript
// Agregar al inicio del archivo, línea ~69
import { 
  subirDocumentoEmbarque, 
  eliminarDocumentoEmbarque, 
  listarDocumentosEmbarque 
} from "@/lib/blob";
```

### 2. Agregar Interface para DocumentoEmbarque
```typescript
// Agregar después de las interfaces existentes, línea ~100
interface DocumentoEmbarque {
  id?: string;
  embarque_id?: string;
  nombre_archivo: string;
  url_blob: string;
  pathname: string;
  tipo_archivo?: string;
  tamano_bytes?: number;
  uploaded_at?: string;
  created_at?: string;
}
```

### 3. Agregar Estados
```typescript
// Agregar después de los estados existentes, línea ~166
const [documentosEmbarque, setDocumentosEmbarque] = useState<DocumentoEmbarque[]>([]);
const [uploadingDocumento, setUploadingDocumento] = useState(false);
```

### 4. Agregar Función para Subir Documentos
```typescript
// Agregar después de handleSave, línea ~2050
const handleUploadDocumentoEmbarque = async (file: File) => {
  if (!file) return;

  // Validar límite de 10 documentos
  if (documentosEmbarque.length >= 10) {
    toast({
      title: "Límite alcanzado",
      description: "Solo se pueden subir hasta 10 documentos por embarque",
      variant: "destructive",
    });
    return;
  }

  try {
    setUploadingDocumento(true);

    // Si estamos editando, subir directamente
    if (embarqueEditando) {
      const { url, pathname } = await subirDocumentoEmbarque(
        embarqueEditando.id,
        file
      );

      // Guardar en la base de datos
      const { data, error } = await supabase
        .from('documentos_embarques')
        .insert({
          embarque_id: embarqueEditando.id,
          nombre_archivo: file.name,
          url_blob: url,
          pathname: pathname,
          tipo_archivo: file.type,
          tamano_bytes: file.size,
        })
        .select()
        .single();

      if (error) throw error;

      setDocumentosEmbarque(prev => [...prev, data]);
      
      toast({
        title: "Documento subido",
        description: `${file.name} se subió correctamente`,
      });
    } else {
      // Si estamos creando, guardar temporalmente para subir después
      const tempDoc: DocumentoEmbarque = {
        nombre_archivo: file.name,
        url_blob: URL.createObjectURL(file),
        pathname: "", // Se asignará después
        tipo_archivo: file.type,
        tamano_bytes: file.size,
        // @ts-ignore - almacenar el file temporalmente
        _tempFile: file,
      };
      
      setDocumentosEmbarque(prev => [...prev, tempDoc]);
      
      toast({
        title: "Documento agregado",
        description: `${file.name} se subirá al guardar el embarque`,
      });
    }
  } catch (error: any) {
    console.error("Error subiendo documento:", error);
    toast({
      title: "Error",
      description: error.message || "No se pudo subir el documento",
      variant: "destructive",
    });
  } finally {
    setUploadingDocumento(false);
  }
};

const handleEliminarDocumentoEmbarque = async (documento: DocumentoEmbarque) => {
  try {
    // Si tiene ID, está en la BD
    if (documento.id) {
      await eliminarDocumentoEmbarque(documento.pathname);
      
      const { error } = await supabase
        .from('documentos_embarques')
        .delete()
        .eq('id', documento.id);

      if (error) throw error;
    }

    setDocumentosEmbarque(prev => 
      prev.filter(d => 
        documento.id ? d.id !== documento.id : d.nombre_archivo !== documento.nombre_archivo
      )
    );

    toast({
      title: "Documento eliminado",
      description: "El documento se eliminó correctamente",
    });
  } catch (error: any) {
    console.error("Error eliminando documento:", error);
    toast({
      title: "Error",
      description: "No se pudo eliminar el documento",
      variant: "destructive",
    });
  }
};
```

### 5. Modificar handleSave
```typescript
// Dentro de handleSave, después de crear el embarque (línea ~1500-1600)
// Agregar después de la inserción exitosa:

if (data && data.id) {
  // Subir documentos temporales
  for (const doc of documentosEmbarque) {
    if ((doc as any)._tempFile) {
      try {
        const file = (doc as any)._tempFile;
        const { url, pathname } = await subirDocumentoEmbarque(data.id, file);
        
        await supabase.from('documentos_embarques').insert({
          embarque_id: data.id,
          nombre_archivo: file.name,
          url_blob: url,
          pathname: pathname,
          tipo_archivo: file.type,
          tamano_bytes: file.size,
        });
      } catch (error) {
        console.error("Error subiendo documento:", error);
      }
    }
  }
}
```

### 6. Modificar handleEdit
```typescript
// En handleEdit, cargar documentos del embarque (línea ~1200)
const handleEdit = async (embarque: Embarque) => {
  // ... código existente ...
  
  // Cargar documentos del embarque
  try {
    const docs = await listarDocumentosEmbarque(embarque.id);
    setDocumentosEmbarque(docs);
  } catch (error) {
    console.error("Error cargando documentos:", error);
  }
  
  // ... resto del código ...
};
```

### 7. Modificar resetForm
```typescript
// En resetForm, limpiar documentos (línea ~480)
const resetForm = () => {
  // ... código existente ...
  setDocumentosEmbarque([]);
  // ... resto del código ...
};
```

### 8. Agregar Sección en el Modal
```typescript
// En el modal de crear/editar embarque, agregar después de la sección de Observaciones (línea ~5700)

<Card>
  <CardHeader>
    <CardTitle className="text-lg">Documentos del Embarque</CardTitle>
    <CardDescription>
      Sube hasta 10 documentos o imágenes relacionadas con este embarque
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {/* Input para subir archivos */}
      <div>
        <Label htmlFor="documento-embarque">
          Agregar Documento/Imagen {documentosEmbarque.length < 10 && `(${documentosEmbarque.length}/10)`}
        </Label>
        <Input
          id="documento-embarque"
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleUploadDocumentoEmbarque(file);
              e.target.value = "";
            }
          }}
          disabled={uploadingDocumento || documentosEmbarque.length >= 10}
          className="mt-2"
        />
        {documentosEmbarque.length >= 10 && (
          <p className="text-sm text-orange-600 mt-1">
            Has alcanzado el límite de 10 documentos
          </p>
        )}
      </div>

      {/* Lista de documentos */}
      {documentosEmbarque.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documentosEmbarque.map((doc, index) => (
            <div
              key={doc.id || index}
              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {doc.tipo_archivo?.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-red-600 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {doc.nombre_archivo}
                  </p>
                  {doc.tamano_bytes && (
                    <p className="text-xs text-gray-500">
                      {(doc.tamano_bytes / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {doc.url_blob && !doc.url_blob.startsWith("blob:") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(doc.url_blob, "_blank")}
                    className="h-8 w-8 p-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEliminarDocumentoEmbarque(doc)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </CardContent>
</Card>
```

### 9. Agregar en Modal de Detalles
```typescript
// En el dialog de detalles del embarque (línea ~6200), agregar sección de documentos:

{embarqueSeleccionado && (
  <Card className="mt-4">
    <CardHeader>
      <CardTitle className="text-lg">Documentos del Embarque</CardTitle>
    </CardHeader>
    <CardContent>
      {documentosEmbarque.length === 0 ? (
        <p className="text-sm text-gray-500">No hay documentos asociados</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documentosEmbarque.map((doc) => (
            <a
              key={doc.id}
              href={doc.url_blob}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              {doc.tipo_archivo?.startsWith("image/") ? (
                <ImageIcon className="h-4 w-4 text-blue-600" />
              ) : (
                <FileText className="h-4 w-4 text-red-600" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {doc.nombre_archivo}
                </p>
                <p className="text-xs text-gray-500">
                  {doc.tamano_bytes && `${(doc.tamano_bytes / 1024).toFixed(1)} KB`}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
)}
```

### 10. Cargar Documentos al Abrir Detalles
```typescript
// Cuando se abre el modal de detalles, cargar documentos (línea ~3500)
const verDetalles = async (embarque: Embarque) => {
  // ... código existente ...
  
  // Cargar documentos
  try {
    const docs = await listarDocumentosEmbarque(embarque.id);
    setDocumentosEmbarque(docs);
  } catch (error) {
    console.error("Error cargando documentos:", error);
  }
  
  // ... resto del código ...
};
```

## Pasos de Implementación

1. ✅ Ejecutar SQL en Supabase: `EJECUTAR-EN-SUPABASE-documentos-embarques.sql`
2. ✅ Funciones agregadas en `lib/blob.ts`
3. ⏳ Agregar imports en `app/embarques/page.tsx`
4. ⏳ Agregar interface `DocumentoEmbarque`
5. ⏳ Agregar estados para documentos
6. ⏳ Agregar funciones de manejo de documentos
7. ⏳ Modificar `handleSave` para subir documentos temporales
8. ⏳ Modificar `handleEdit` para cargar documentos existentes
9. ⏳ Modificar `resetForm` para limpiar documentos
10. ⏳ Agregar sección de documentos en modal de crear/editar
11. ⏳ Agregar sección de documentos en modal de detalles
12. ⏳ Agregar carga de documentos al ver detalles

## Notas Importantes

- Máximo 10 documentos por embarque
- Formatos permitidos: Imágenes (JPG, PNG, GIF, BMP, WebP) y PDF
- Tamaño máximo por archivo: 10MB
- Los documentos se suben al crear/editar embarque
- Se almacenan en Vercel Blob bajo la ruta: `embarques/{embarque_id}/documentos/`

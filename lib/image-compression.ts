import imageCompression from 'browser-image-compression';

// Configuración por defecto para compresión de imágenes
export const DEFAULT_COMPRESSION_CONFIG = {
  maxSizeMB: 0.8,            // Máximo 800KB 
  maxWidthOrHeight: 1600,    // Máximo 1600px (bueno para móviles)
  useWebWorker: true,        // No bloquear UI principal
  fileType: 'image/jpeg',    // Convertir a JPEG para mejor compresión
  quality: 0.85,             // 85% calidad (buen balance)
  alwaysKeepResolution: false, // Permitir reducir resolución si es necesario
  initialQuality: 0.85       // Calidad inicial
};

// Configuración agresiva para archivos muy grandes
export const AGGRESSIVE_COMPRESSION_CONFIG = {
  ...DEFAULT_COMPRESSION_CONFIG,
  maxSizeMB: 0.5,            // Máximo 500KB
  maxWidthOrHeight: 1200,    // Máximo 1200px
  quality: 0.75              // 75% calidad
};

// Interfaz para el resultado de compresión
export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionPercentage: number;
}

/**
 * Comprime una imagen usando la configuración especificada
 * @param file - Archivo de imagen a comprimir
 * @param config - Configuración de compresión (opcional)
 * @returns Resultado de la compresión con estadísticas
 */
export async function compressImage(
  file: File, 
  config = DEFAULT_COMPRESSION_CONFIG
): Promise<CompressionResult> {
  
  // Verificar que es una imagen
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }

  // Si el archivo ya es pequeño, usar configuración menos agresiva
  const finalConfig = file.size > 2 * 1024 * 1024 // Si es mayor a 2MB
    ? AGGRESSIVE_COMPRESSION_CONFIG 
    : config;

  try {
    console.log('🔄 Comprimiendo imagen:', {
      nombre: file.name,
      tamaño_original: formatFileSize(file.size),
      tipo: file.type
    });

    const compressedFile = await imageCompression(file, finalConfig);
    
    const originalSize = file.size;
    const compressedSize = compressedFile.size;
    const compressionRatio = originalSize / compressedSize;
    const compressionPercentage = ((originalSize - compressedSize) / originalSize) * 100;

    console.log('✅ Compresión completada:', {
      tamaño_original: formatFileSize(originalSize),
      tamaño_comprimido: formatFileSize(compressedSize),
      reducción: `${compressionPercentage.toFixed(1)}%`,
      ratio: `${compressionRatio.toFixed(1)}:1`
    });

    return {
      compressedFile,
      originalSize,
      compressedSize,
      compressionRatio,
      compressionPercentage
    };
    
  } catch (error) {
    console.error('❌ Error comprimiendo imagen:', error);
    throw new Error(`Error al comprimir imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Comprime múltiples imágenes en paralelo
 * @param files - Array de archivos de imagen
 * @param config - Configuración de compresión
 * @param onProgress - Callback para progreso (opcional)
 * @returns Array de resultados de compresión
 */
export async function compressMultipleImages(
  files: File[],
  config = DEFAULT_COMPRESSION_CONFIG,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<CompressionResult[]> {
  
  const results: CompressionResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (onProgress) {
      onProgress(i + 1, files.length, file.name);
    }
    
    try {
      // Solo comprimir imágenes, pasar otros archivos sin comprimir
      if (file.type.startsWith('image/')) {
        const result = await compressImage(file, config);
        results.push(result);
      } else {
        // Para archivos no-imagen, crear un resultado "sin compresión"
        results.push({
          compressedFile: file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 1,
          compressionPercentage: 0
        });
      }
    } catch (error) {
      console.error(`❌ Error comprimiendo ${file.name}:`, error);
      // En caso de error, usar archivo original
      results.push({
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1,
        compressionPercentage: 0
      });
    }
  }
  
  return results;
}

/**
 * Determina si un archivo necesita compresión
 * @param file - Archivo a evaluar
 * @param maxSizeMB - Tamaño máximo en MB antes de comprimir
 * @returns true si necesita compresión
 */
export function needsCompression(file: File, maxSizeMB = 1): boolean {
  if (!file.type.startsWith('image/')) {
    return false;
  }
  
  return file.size > (maxSizeMB * 1024 * 1024);
}

/**
 * Formatea el tamaño de archivo en unidades legibles
 * @param bytes - Tamaño en bytes
 * @returns Tamaño formateado (ej: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Obtiene información detallada de un archivo
 * @param file - Archivo a analizar
 * @returns Información del archivo
 */
export function getFileInfo(file: File) {
  return {
    name: file.name,
    size: file.size,
    formattedSize: formatFileSize(file.size),
    type: file.type,
    lastModified: new Date(file.lastModified),
    isImage: file.type.startsWith('image/'),
    isPDF: file.type === 'application/pdf',
    needsCompression: needsCompression(file)
  };
}
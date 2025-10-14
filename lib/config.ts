// Configuración centralizada de variables de entorno
// Este archivo ayuda a tener todas las variables en un solo lugar

export const config = {
  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRole: process.env.SUPABASE_SERVICE_ROLE,
  },

  // Google Maps
  googleMaps: {
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  },

  // Vercel Blob (para uploads)
  blob: {
    token: process.env.BLOB_READ_WRITE_TOKEN,
  },
} as const;

// Validar que las variables críticas estén configuradas
export function validateConfig() {
  const errors: string[] = [];

  if (!config.supabase.url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL no está configurada');
  }

  if (!config.supabase.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada');
  }

  if (!config.googleMaps.apiKey) {
    console.warn('⚠️ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no está configurada. El mapa de Google Maps no funcionará.');
  }

  if (errors.length > 0) {
    throw new Error(`Configuración inválida:\n${errors.join('\n')}`);
  }
}

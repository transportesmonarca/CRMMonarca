-- Agregar campo 'activo' a la tabla public_links para control de ligas desactivadas
-- Agregar campo 'google_maps_link' a embarques para referencia de ubicación

-- 1. Agregar campo activo a public_links (TRUE por defecto)
ALTER TABLE public_links 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- 2. Actualizar todas las ligas existentes como activas
UPDATE public_links SET activo = TRUE WHERE activo IS NULL;

-- 3. Agregar campo google_maps_link a embarques
ALTER TABLE embarques 
ADD COLUMN IF NOT EXISTS google_maps_link TEXT;

-- 4. Crear índice para mejorar consultas de ligas activas por embarque
CREATE INDEX IF NOT EXISTS idx_public_links_embarque_activo 
ON public_links(embarque_id, activo) 
WHERE activo = TRUE;

-- 5. Comentarios para documentación
COMMENT ON COLUMN public_links.activo IS 'Indica si la liga pública está activa. Se desactiva cuando el embarque se finaliza o cancela.';
COMMENT ON COLUMN embarques.google_maps_link IS 'Enlace de Google Maps para referencia del cliente en la vista pública.';

-- 6. Crear función para desactivar liga al finalizar/cancelar embarque
CREATE OR REPLACE FUNCTION desactivar_liga_publica_embarque()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el embarque se finaliza o cancela, desactivar sus ligas públicas
  IF (NEW.estado LIKE 'finalizado%' OR NEW.estado LIKE 'cancelado%') 
     AND (OLD.estado NOT LIKE 'finalizado%' AND OLD.estado NOT LIKE 'cancelado%') THEN
    
    UPDATE public_links 
    SET activo = FALSE, 
        updated_at = NOW()
    WHERE embarque_id = NEW.id 
      AND activo = TRUE;
    
    RAISE NOTICE 'Liga pública desactivada para embarque %', NEW.folio;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para desactivar liga automáticamente
DROP TRIGGER IF EXISTS trigger_desactivar_liga_embarque ON embarques;
CREATE TRIGGER trigger_desactivar_liga_embarque
  AFTER UPDATE OF estado ON embarques
  FOR EACH ROW
  EXECUTE FUNCTION desactivar_liga_publica_embarque();

-- 8. Verificar que la migración se aplicó correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'public_links' AND column_name = 'activo'
  ) THEN
    RAISE NOTICE '✅ Campo activo agregado correctamente a public_links';
  ELSE
    RAISE WARNING '❌ No se pudo agregar campo activo a public_links';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'embarques' AND column_name = 'google_maps_link'
  ) THEN
    RAISE NOTICE '✅ Campo google_maps_link agregado correctamente a embarques';
  ELSE
    RAISE WARNING '❌ No se pudo agregar campo google_maps_link a embarques';
  END IF;
END $$;

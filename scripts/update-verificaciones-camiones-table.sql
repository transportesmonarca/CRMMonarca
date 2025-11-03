-- ========================================
-- SCRIPT PARA ACTUALIZAR TABLA VERIFICACIONES_CAMIONES
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ========================================

-- Primero, agregar las nuevas columnas si no existen
DO $$
BEGIN
    -- Agregar fecha_vencimiento si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'verificaciones_camiones' 
                   AND column_name = 'fecha_vencimiento') THEN
        ALTER TABLE verificaciones_camiones ADD COLUMN fecha_vencimiento DATE;
    END IF;

    -- Agregar numero_certificado si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'verificaciones_camiones' 
                   AND column_name = 'numero_certificado') THEN
        ALTER TABLE verificaciones_camiones ADD COLUMN numero_certificado VARCHAR(100);
    END IF;

    -- Agregar observaciones si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'verificaciones_camiones' 
                   AND column_name = 'observaciones') THEN
        ALTER TABLE verificaciones_camiones ADD COLUMN observaciones TEXT;
    END IF;
END
$$;

-- Migrar datos existentes si hay campos antiguos
DO $$
BEGIN
    -- Migrar proxima_verificacion a fecha_vencimiento si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'verificaciones_camiones' 
               AND column_name = 'proxima_verificacion') THEN
        UPDATE verificaciones_camiones 
        SET fecha_vencimiento = proxima_verificacion 
        WHERE fecha_vencimiento IS NULL AND proxima_verificacion IS NOT NULL;
    END IF;

    -- Migrar numero_folio a numero_certificado si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'verificaciones_camiones' 
               AND column_name = 'numero_folio') THEN
        UPDATE verificaciones_camiones 
        SET numero_certificado = numero_folio 
        WHERE numero_certificado IS NULL AND numero_folio IS NOT NULL;
    END IF;

    -- Migrar comentarios a observaciones si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'verificaciones_camiones' 
               AND column_name = 'comentarios') THEN
        UPDATE verificaciones_camiones 
        SET observaciones = comentarios 
        WHERE observaciones IS NULL AND comentarios IS NOT NULL;
    END IF;
END
$$;

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_fecha_vencimiento ON verificaciones_camiones(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_numero_certificado ON verificaciones_camiones(numero_certificado);

-- Actualizar función para sincronizar fechas con tabla camiones
CREATE OR REPLACE FUNCTION actualizar_fechas_verificacion_camion()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar última verificación y próxima verificación en tabla camiones
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE camiones SET
      ultima_verificacion = NEW.fecha_verificacion,
      -- Usar fecha_vencimiento si está disponible, sino calcular 6 meses
      proxima_verificacion = COALESCE(NEW.fecha_vencimiento, NEW.fecha_verificacion + INTERVAL '6 months'),
      updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = NEW.camion_id;
    
    RETURN NEW;
  END IF;
  
  -- Si se elimina una verificación, recalcular la última verificación
  IF TG_OP = 'DELETE' THEN
    UPDATE camiones SET
      ultima_verificacion = (
        SELECT MAX(fecha_verificacion) 
        FROM verificaciones_camiones 
        WHERE camion_id = OLD.camion_id AND activo = true AND id != OLD.id
      ),
      proxima_verificacion = (
        SELECT MIN(fecha_vencimiento) 
        FROM verificaciones_camiones 
        WHERE camion_id = OLD.camion_id AND activo = true AND id != OLD.id AND fecha_vencimiento > CURRENT_DATE
      ),
      updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = OLD.camion_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Recrear el trigger
DROP TRIGGER IF EXISTS sync_verificaciones_camiones ON verificaciones_camiones;
CREATE TRIGGER sync_verificaciones_camiones
  AFTER INSERT OR UPDATE OR DELETE ON verificaciones_camiones
  FOR EACH ROW
  EXECUTE PROCEDURE actualizar_fechas_verificacion_camion();

-- Comentarios para las nuevas columnas
COMMENT ON COLUMN verificaciones_camiones.fecha_vencimiento IS 'Fecha de vencimiento de la verificación';
COMMENT ON COLUMN verificaciones_camiones.numero_certificado IS 'Número del certificado de verificación';
COMMENT ON COLUMN verificaciones_camiones.observaciones IS 'Observaciones y comentarios sobre la verificación';
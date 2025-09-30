# 🚀 PLAN DE CONSOLIDACIÓN DE TABLAS EMBARQUES

## 📊 ESTADO ACTUAL
- **❌ Múltiples tablas**: `embarques`, `embarques_nuevo`, `embarques_import`, `embarque_modificaciones`
- **❌ Múltiples vistas**: `embarques_completa`, `embarques_completa_new`
- **❌ Sistema dual**: Legacy vs Normalizado
- **❌ Complejidad**: UI maneja 2 arquitecturas diferentes

## 🎯 OBJETIVO FINAL
- **✅ Una sola tabla principal**: `embarques` (consolidada)
- **✅ Una tabla de auditoría**: `embarques_historial`
- **✅ Una tabla staging**: `embarques_import` (temporal)
- **✅ UI unificada**: Sin lógica dual

## 📋 FASES DE MIGRACIÓN

### **FASE 1: ANÁLISIS Y PREPARACIÓN**
1. **Auditar datos existentes**
   - Comparar registros entre `embarques` y `embarques_nuevo`
   - Identificar campos únicos de cada tabla
   - Detectar inconsistencias de datos
   
2. **Crear tabla consolidada**
   - Combinar esquemas de ambas tablas
   - Mantener todos los campos necesarios
   - Agregar campos de control (`tabla_origen`, `migrado_en`)

### **FASE 2: MIGRACIÓN DE DATOS**
1. **Script de migración**
   - Crear `embarques_consolidada` temporal
   - Migrar datos de `embarques` (legacy)
   - Migrar datos de `embarques_nuevo` (normalizado)
   - Resolver conflictos de datos duplicados

2. **Validación de integridad**
   - Verificar que no se pierdan datos
   - Comprobar relaciones FK
   - Validar campos críticos

### **FASE 3: ACTUALIZACIÓN DE UI**
1. **Actualizar componentes**
   - `app/embarques/page.tsx`
   - APIs en `app/api/embarques/`
   - Hooks y utilities

2. **Eliminar lógica dual**
   - Remover referencias a `embarques_nuevo`
   - Simplificar queries
   - Unificar estados

### **FASE 4: LIMPIEZA FINAL**
1. **Renombrar tablas**
   - `embarques` → `embarques_legacy_backup`
   - `embarques_consolidada` → `embarques`
   
2. **Eliminar tablas obsoletas**
   - `embarques_nuevo`
   - Vistas innecesarias
   - Funciones legacy

## 🛠️ SCRIPTS NECESARIOS

### 1. Script de Auditoría
```sql
-- Comparar datos entre tablas
SELECT 'embarques' as tabla, COUNT(*) as registros FROM embarques
UNION ALL
SELECT 'embarques_nuevo' as tabla, COUNT(*) as registros FROM embarques_nuevo;
```

### 2. Script de Consolidación
```sql
-- Crear tabla consolidada
CREATE TABLE embarques_consolidada (
    -- Campos de embarques (legacy)
    -- Campos de embarques_nuevo (normalizado)
    -- Campos de control
    tabla_origen VARCHAR(20),
    migrado_en TIMESTAMP DEFAULT NOW()
);
```

### 3. Script de Migración UI
```typescript
// Actualizar todas las queries a usar solo 'embarques'
const { data } = await supabase
  .from('embarques') // En lugar de lógica dual
  .select('*')
```

## ⚠️ RIESGOS Y MITIGACIONES

### **Riesgos Identificados**
1. **Pérdida de datos** durante migración
2. **Downtime** durante el cambio
3. **Conflictos** en datos duplicados
4. **Errores** en UI durante transición

### **Mitigaciones**
1. **Backups completos** antes de cada fase
2. **Migración gradual** con rollback
3. **Scripts de validación** exhaustivos
4. **Testing** en ambiente de desarrollo

## 📅 CRONOGRAMA SUGERIDO

### **Semana 1: Preparación**
- [ ] Ejecutar auditoría completa
- [ ] Crear scripts de migración
- [ ] Testing en ambiente dev

### **Semana 2: Migración Backend**
- [ ] Crear tabla consolidada
- [ ] Migrar datos
- [ ] Validar integridad

### **Semana 3: Migración Frontend**
- [ ] Actualizar UI components
- [ ] Actualizar APIs
- [ ] Testing funcional

### **Semana 4: Limpieza**
- [ ] Renombrar tablas
- [ ] Eliminar código legacy
- [ ] Documentación final

## 🎯 BENEFICIOS ESPERADOS

1. **✅ Simplicidad**: Una sola fuente de verdad
2. **✅ Performance**: Menos joins, queries más simples
3. **✅ Mantenimiento**: Código más limpio
4. **✅ Escalabilidad**: Estructura más clara
5. **✅ Debugging**: Menos complejidad para resolver bugs

## 🔄 ROLLBACK PLAN

Si algo sale mal:
1. **Backup automático** de todas las tablas
2. **Scripts de rollback** para cada fase
3. **Monitoreo** de errores en producción
4. **Plan B**: Mantener sistema dual temporalmente
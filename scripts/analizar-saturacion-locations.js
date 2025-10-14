import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('📊 ANÁLISIS DE SATURACIÓN - TABLA LOCATIONS\n');
console.log('='.repeat(100));

async function analizarSaturacion() {
  try {
    // 1. Total de registros
    console.log('\n1️⃣ ANÁLISIS GENERAL');
    console.log('-'.repeat(100));
    
    const { count: totalRegistros, error: countError } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error al contar registros:', countError);
      return;
    }

    console.log(`📦 Total de registros en locations: ${totalRegistros?.toLocaleString() || 0}`);

    // 2. Registros por operador
    console.log('\n2️⃣ DUPLICADOS POR OPERADOR');
    console.log('-'.repeat(100));

    const { data: duplicados, error: dupError } = await supabase
      .rpc('analyze_location_duplicates', {}, { count: 'exact' })
      .catch(async () => {
        // Si la función RPC no existe, hacer consulta manual
        const { data: allLocations } = await supabase
          .from('locations')
          .select('operator_id, captured_at')
          .order('captured_at', { ascending: false });

        if (!allLocations) return { data: null, error: null };

        // Agrupar por operator_id
        const grouped = allLocations.reduce((acc, loc) => {
          const key = loc.operator_id || 'NULL';
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(loc);
          return acc;
        }, {});

        return {
          data: Object.entries(grouped).map(([operator_id, locs]) => ({
            operator_id,
            total: locs.length,
            primera: locs[locs.length - 1]?.captured_at,
            ultima: locs[0]?.captured_at
          })).sort((a, b) => b.total - a.total),
          error: null
        };
      });

    if (duplicados && duplicados.data) {
      const topDuplicados = duplicados.data.slice(0, 10);
      
      console.log('\n🔝 Top 10 operadores con más ubicaciones:\n');
      
      for (const dup of topDuplicados) {
        const operatorId = dup.operator_id;
        
        // Buscar nombre del operador
        let nombreOperador = 'Desconocido';
        if (operatorId && operatorId !== 'NULL' && operatorId.length > 10) {
          const { data: operador } = await supabase
            .from('operadores')
            .select('nombre, apellidos, operator_number')
            .eq('id', operatorId)
            .single()
            .catch(() => ({ data: null }));
          
          if (operador) {
            nombreOperador = `${operador.nombre} ${operador.apellidos || ''} (${operador.operator_number || 'N/A'})`;
          }
        }

        console.log(`   ${dup.total.toString().padStart(4)} ubicaciones | ${nombreOperador}`);
        
        if (dup.primera && dup.ultima) {
          const primera = new Date(dup.primera);
          const ultima = new Date(dup.ultima);
          const dias = Math.floor((ultima - primera) / (1000 * 60 * 60 * 24));
          console.log(`        Periodo: ${dias} días (${primera.toLocaleDateString()} - ${ultima.toLocaleDateString()})`);
        }
        console.log('');
      }
    }

    // 3. Calcular proyección de crecimiento
    console.log('\n3️⃣ PROYECCIÓN DE CRECIMIENTO');
    console.log('-'.repeat(100));

    const { data: recent, error: recentError } = await supabase
      .from('locations')
      .select('captured_at')
      .gte('captured_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('captured_at', { ascending: true });

    if (!recentError && recent && recent.length > 0) {
      const registrosUltimas24h = recent.length;
      const registrosPorDia = registrosUltimas24h;
      const registrosPorMes = registrosUltimas24h * 30;
      const registrosPorAno = registrosUltimas24h * 365;

      console.log(`\n📈 Registros en las últimas 24 horas: ${registrosUltimas24h.toLocaleString()}`);
      console.log(`\n⚠️  PROYECCIÓN SI CONTINÚA ASÍ:`);
      console.log(`   • Por día: ${registrosPorDia.toLocaleString()} registros`);
      console.log(`   • Por mes: ${registrosPorMes.toLocaleString()} registros`);
      console.log(`   • Por año: ${registrosPorAno.toLocaleString()} registros`);
      
      // Estimar tamaño (promedio 200 bytes por registro)
      const bytesRegistro = 200;
      const mbPorAno = (registrosPorAno * bytesRegistro) / (1024 * 1024);
      const gbPorAno = mbPorAno / 1024;
      
      console.log(`\n💾 ESTIMACIÓN DE ALMACENAMIENTO:`);
      console.log(`   • Tamaño estimado por año: ${gbPorAno.toFixed(2)} GB`);
      
      if (gbPorAno > 10) {
        console.log(`   🚨 ALERTA: Crecimiento acelerado detectado!`);
      } else if (gbPorAno > 5) {
        console.log(`   ⚠️  ADVERTENCIA: Monitorear crecimiento`);
      } else {
        console.log(`   ✅ Crecimiento dentro de lo normal`);
      }
    }

    // 4. Ubicaciones antiguas
    console.log('\n4️⃣ ANÁLISIS TEMPORAL');
    console.log('-'.repeat(100));

    const now = new Date();
    const intervals = [
      { label: 'Últimos 5 minutos', minutes: 5 },
      { label: 'Última hora', minutes: 60 },
      { label: 'Últimas 24 horas', minutes: 1440 },
      { label: 'Última semana', minutes: 10080 },
      { label: 'Más de 1 semana', minutes: null }
    ];

    console.log('\n📅 Distribución temporal de ubicaciones:\n');

    for (const interval of intervals) {
      if (interval.minutes) {
        const timeAgo = new Date(now.getTime() - interval.minutes * 60 * 1000);
        const { count } = await supabase
          .from('locations')
          .select('*', { count: 'exact', head: true })
          .gte('captured_at', timeAgo.toISOString());
        
        console.log(`   ${interval.label.padEnd(20)}: ${(count || 0).toString().padStart(6)} registros`);
      } else {
        const oneWeekAgo = new Date(now.getTime() - 10080 * 60 * 1000);
        const { count } = await supabase
          .from('locations')
          .select('*', { count: 'exact', head: true })
          .lt('captured_at', oneWeekAgo.toISOString());
        
        console.log(`   ${interval.label.padEnd(20)}: ${(count || 0).toString().padStart(6)} registros (❌ Pueden eliminarse)`);
      }
    }

    // 5. Recomendaciones
    console.log('\n5️⃣ RECOMENDACIONES');
    console.log('-'.repeat(100));

    const ubicacionesPorOperador = {};
    if (duplicados && duplicados.data) {
      duplicados.data.forEach(d => {
        if (d.operator_id !== 'NULL') {
          ubicacionesPorOperador[d.operator_id] = d.total;
        }
      });
    }

    const operadoresConDuplicados = Object.values(ubicacionesPorOperador).filter(total => total > 1).length;
    const maxUbicaciones = Math.max(...Object.values(ubicacionesPorOperador), 0);

    console.log('\n📋 ESTADO ACTUAL:');
    console.log(`   • Total de registros: ${totalRegistros?.toLocaleString() || 0}`);
    console.log(`   • Operadores con duplicados: ${operadoresConDuplicados}`);
    console.log(`   • Máximo de ubicaciones por operador: ${maxUbicaciones}`);

    console.log('\n🎯 ACCIONES RECOMENDADAS:\n');

    if (operadoresConDuplicados > 0) {
      console.log('   🔴 URGENTE:');
      console.log('   1. Ejecutar SQL-OPTIMIZAR-LOCATIONS.sql para limpiar duplicados');
      console.log('   2. Agregar constraint UNIQUE en operator_id');
      console.log('   3. Actualizar app móvil para usar UPSERT en lugar de INSERT\n');
    }

    console.log('   🟡 MEDIANO PLAZO:');
    console.log('   1. Implementar throttling en la app móvil (enviar cada 1-5 minutos)');
    console.log('   2. Agregar filtro de distancia mínima (ej: solo enviar si se movió >50m)');
    console.log('   3. Implementar tabla de historial para conservar trayectorias\n');

    console.log('   🟢 LARGO PLAZO:');
    console.log('   1. Configurar limpieza automática de registros antiguos');
    console.log('   2. Implementar Edge Function para mantenimiento programado');
    console.log('   3. Dashboard de monitoreo de ubicaciones en tiempo real\n');

    console.log('='.repeat(100));
    console.log('\n✅ Análisis completado');
    console.log(`📖 Ver más detalles en: OPTIMIZACION-TABLA-LOCATIONS.md\n`);

  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  }
}

analizarSaturacion();

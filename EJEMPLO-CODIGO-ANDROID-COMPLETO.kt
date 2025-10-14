/**
 * EJEMPLO COMPLETO: Código Android para enviar ubicaciones a Supabase
 * 
 * Este es un ejemplo de cómo DEBERÍA quedar el código después de los cambios
 * Puedes usar este código como referencia para implementar en tu proyecto
 */

package com.monarca.app.location

import android.content.Context
import android.content.SharedPreferences
import android.location.Location
import android.provider.Settings
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from

/**
 * Clase para manejar el envío de ubicaciones a Supabase
 */
class LocationManager(
    private val context: Context,
    private val supabase: SupabaseClient
) {
    private val prefs: SharedPreferences = 
        context.getSharedPreferences("monarca_prefs", Context.MODE_PRIVATE)
    
    private var lastSentLocation: Location? = null
    private var lastSentTime: Long = 0
    
    companion object {
        private const val TAG = "LocationManager"
        
        // Configuración de throttling
        const val MIN_TIME_MS = 60_000L      // 1 minuto
        const val MIN_DISTANCE_M = 50f       // 50 metros
        const val MAX_ACCURACY_M = 20f       // 20 metros precisión máxima
        
        // Keys para SharedPreferences
        private const val KEY_OPERATOR_UUID = "operator_uuid"
        private const val KEY_OPERATOR_NUMBER = "operator_number"
    }
    
    /**
     * Guardar información del operador al iniciar sesión
     */
    suspend fun saveOperatorInfo(operatorNumber: String) {
        try {
            // Consultar UUID del operador desde Supabase
            val response = supabase.from("operadores")
                .select(columns = "id, numero_operador") {
                    filter {
                        eq("numero_operador", operatorNumber)
                    }
                }
                .decodeSingle<Operator>()
            
            // Guardar en SharedPreferences
            prefs.edit().apply {
                putString(KEY_OPERATOR_UUID, response.id)
                putString(KEY_OPERATOR_NUMBER, response.numero_operador)
                apply()
            }
            
            Log.d(TAG, "✅ Operador guardado: ${response.numero_operador} (${response.id})")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error al guardar operador: ${e.message}", e)
            throw e
        }
    }
    
    /**
     * Obtener UUID del operador guardado
     */
    private fun getOperatorUUID(): String? {
        return prefs.getString(KEY_OPERATOR_UUID, null)
    }
    
    /**
     * Obtener número del operador guardado
     */
    private fun getOperatorNumber(): String? {
        return prefs.getString(KEY_OPERATOR_NUMBER, null)
    }
    
    /**
     * Obtener device ID
     */
    private fun getDeviceId(): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        )
    }
    
    /**
     * Determinar si se debe enviar la ubicación (throttling)
     */
    private fun shouldSendLocation(newLocation: Location): Boolean {
        val now = System.currentTimeMillis()
        val lastLoc = lastSentLocation
        
        return when {
            // Primera ubicación siempre se envía
            lastLoc == null -> {
                Log.d(TAG, "📍 Primera ubicación - se enviará")
                true
            }
            
            // Si la precisión es mala, no enviar
            newLocation.accuracy > MAX_ACCURACY_M -> {
                Log.d(TAG, "⏭️  Ubicación omitida: precisión baja (${newLocation.accuracy}m > ${MAX_ACCURACY_M}m)")
                false
            }
            
            // Si pasó suficiente tiempo, enviar
            (now - lastSentTime) > MIN_TIME_MS -> {
                Log.d(TAG, "⏰ Tiempo transcurrido - se enviará")
                true
            }
            
            // Si se movió más de 50 metros, enviar
            lastLoc.distanceTo(newLocation) > MIN_DISTANCE_M -> {
                Log.d(TAG, "📏 Distancia significativa - se enviará")
                true
            }
            
            // Si no cumple ninguna condición, no enviar
            else -> {
                Log.d(TAG, "⏭️  Ubicación omitida: no cumple criterios de throttling")
                false
            }
        }
    }
    
    /**
     * Callback principal cuando se recibe una nueva ubicación
     */
    suspend fun onLocationUpdate(location: Location) {
        withContext(Dispatchers.IO) {
            try {
                if (shouldSendLocation(location)) {
                    sendLocationToSupabase(location)
                    
                    // Actualizar última ubicación enviada
                    lastSentLocation = location
                    lastSentTime = System.currentTimeMillis()
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error procesando ubicación: ${e.message}", e)
            }
        }
    }
    
    /**
     * Enviar ubicación a Supabase
     */
    private suspend fun sendLocationToSupabase(location: Location) {
        val operatorUUID = getOperatorUUID()
        val operatorNumber = getOperatorNumber()
        
        if (operatorUUID == null || operatorNumber == null) {
            Log.e(TAG, "❌ No hay información del operador guardada")
            return
        }
        
        try {
            // Preparar datos
            val data = mapOf(
                "operator_id" to operatorUUID,           // UUID real del operador
                "operator_number" to operatorNumber,     // Número visible (ej: "OP007")
                "latitude" to location.latitude,
                "longitude" to location.longitude,
                "accuracy" to location.accuracy.toDouble(),  // Precisión en metros
                "speed" to location.speed.toDouble(),        // Velocidad en m/s
                "altitude" to location.altitude,             // Altitud en metros
                "heading" to location.bearing.toDouble(),    // Rumbo en grados (0-360)
                "captured_at" to System.currentTimeMillis().toString(),
                "device_id" to getDeviceId()
            )
            
            // Log para debugging
            Log.d(TAG, "📤 Enviando ubicación:")
            Log.d(TAG, "   Operador: $operatorNumber ($operatorUUID)")
            Log.d(TAG, "   Coords: ${location.latitude}, ${location.longitude}")
            Log.d(TAG, "   Precisión: ${location.accuracy}m")
            Log.d(TAG, "   Velocidad: ${location.speed}m/s")
            Log.d(TAG, "   Altitud: ${location.altitude}m")
            Log.d(TAG, "   Rumbo: ${location.bearing}°")
            
            // Enviar a Supabase usando UPSERT
            supabase.from("locations")
                .upsert(data)
            
            Log.d(TAG, "✅ Ubicación guardada exitosamente en Supabase")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error enviando ubicación a Supabase: ${e.message}", e)
            throw e
        }
    }
    
    /**
     * Limpiar información del operador (al cerrar sesión)
     */
    fun clearOperatorInfo() {
        prefs.edit().apply {
            remove(KEY_OPERATOR_UUID)
            remove(KEY_OPERATOR_NUMBER)
            apply()
        }
        lastSentLocation = null
        lastSentTime = 0
        Log.d(TAG, "🔄 Información del operador limpiada")
    }
}

/**
 * Data class para mapear respuesta de Supabase
 */
data class Operator(
    val id: String,              // UUID del operador
    val numero_operador: String  // Número visible (ej: "OP007")
)

/**
 * EJEMPLO DE USO:
 * 
 * // 1. Al iniciar sesión
 * val locationManager = LocationManager(context, supabase)
 * locationManager.saveOperatorInfo("OP007")
 * 
 * // 2. Cuando se recibe ubicación del GPS
 * locationManager.onLocationUpdate(location)
 * 
 * // 3. Al cerrar sesión
 * locationManager.clearOperatorInfo()
 */

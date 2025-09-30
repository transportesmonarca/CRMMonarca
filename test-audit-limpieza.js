// Script simplificado para probar la API de limpieza de audit logs
async function testAPILimpieza() {
    console.log('🔧 Probando API de limpieza de audit logs...')
    
    try {
        // Probar endpoint POST para limpieza
        console.log('\n3️⃣ Probando endpoint POST /api/limpiar-audit-logs...')
        
        const response = await fetch('http://localhost:3001/api/limpiar-audit-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ confirm: true })
        })
        
        console.log(`Status: ${response.status}`)
        console.log(`Status Text: ${response.statusText}`)
        
        let responseData;
        try {
            responseData = await response.json()
            console.log('Response Data:', JSON.stringify(responseData, null, 2))
        } catch (parseError) {
            console.error('Error parsing JSON response:', parseError)
            const textResponse = await response.text()
            console.log('Raw response:', textResponse)
        }

        if (!response.ok) {
            console.error('❌ API call failed:', {
                status: response.status,
                statusText: response.statusText,
                data: responseData
            })
        } else {
            console.log('✅ API call successful')
        }

    } catch (error) {
        console.error('❌ Error general:', error.message)
        console.error('Stack trace:', error.stack)
    }
}

testAPILimpieza()
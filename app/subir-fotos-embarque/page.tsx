"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Camera } from "lucide-react"

export default function SubirFotosEmbarqueIndex() {
  const router = useRouter()
  const [valor, setValor] = useState("")

  return (
    <div className="max-w-xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> Subir Fotos del Embarque</CardTitle>
          <CardDescription>Ingresa el Folio o ID del embarque para continuar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Folio o ID del embarque</Label>
            <Input
              placeholder="Ej. TIM-2507-077 o uuid"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && valor.trim()) router.push(`/subir-fotos-embarque/${encodeURIComponent(valor.trim())}`) }}
            />
          </div>
          <Button
            className="w-full"
            disabled={!valor.trim()}
            onClick={() => valor.trim() && router.push(`/subir-fotos-embarque/${encodeURIComponent(valor.trim())}`)}
          >
            Continuar
          </Button>
          <p className="text-xs text-gray-500">Tip: también puedes abrir esta sección desde el embarque en Asignación.</p>
        </CardContent>
      </Card>
    </div>
  )
}

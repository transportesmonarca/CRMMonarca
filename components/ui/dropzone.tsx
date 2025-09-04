// components/ui/DropZone.tsx
import React, { useRef } from "react"
import { Upload } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DropZoneProps {
    onFilesSelected: (files: File[]) => void
    uploading: boolean
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, uploading }) => {
    const dropRef = useRef<HTMLDivElement>(null)

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const files = Array.from(e.dataTransfer.files)
        onFilesSelected(files)
    }

    const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        onFilesSelected(files)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dropRef.current?.classList.add("border-blue-500")
    }

    const handleDragLeave = () => {
        dropRef.current?.classList.remove("border-blue-500")
    }

    return (
        <div className="space-y-2">
            <Label className="block text-sm font-medium text-gray-700">Seleccionar Archivos</Label>

            <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium transition ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-blue-400"
                    }`}
            >
                <Upload className="h-6 w-6 mb-2 text-gray-500" />
                <p className="text-center">
                    {uploading ? "Subiendo archivos..." : "presiona aquí para subir tus archivos"}
                </p>
                <Input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleSelect}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
            </div>

            <p className="text-xs text-gray-500">
                Formatos permitidos: Imágenes (JPG, PNG, etc.) y PDF. Tamaño máximo: 10MB por archivo.
            </p>
        </div>
    )
}

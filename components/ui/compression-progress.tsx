import React from 'react';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/lib/image-compression';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react';

interface CompressionProgressProps {
  isCompressing: boolean;
  currentFile?: string;
  currentIndex?: number;
  totalFiles?: number;
  originalSize?: number;
  compressedSize?: number;
  compressionPercentage?: number;
}

export function CompressionProgress({
  isCompressing,
  currentFile,
  currentIndex = 0,
  totalFiles = 1,
  originalSize,
  compressedSize,
  compressionPercentage
}: CompressionProgressProps) {
  
  if (!isCompressing) return null;

  const progress = totalFiles > 0 ? (currentIndex / totalFiles) * 100 : 0;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        <h4 className="font-medium text-blue-900">Comprimiendo imágenes...</h4>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-blue-700">
          <span>Archivo {currentIndex} de {totalFiles}</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        {currentFile && (
          <p className="text-sm text-blue-600 truncate">
            📁 {currentFile}
          </p>
        )}
        
        {originalSize && compressedSize && compressionPercentage && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600">
              {formatFileSize(originalSize)} → {formatFileSize(compressedSize)}
            </span>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <Zap className="h-3 w-3 mr-1" />
              -{compressionPercentage.toFixed(1)}%
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

interface CompressionResultSummaryProps {
  results: Array<{
    fileName: string;
    originalSize: number;
    compressedSize: number;
    compressionPercentage: number;
    success: boolean;
  }>;
}

export function CompressionResultSummary({ results }: CompressionResultSummaryProps) {
  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0);
  const totalReduction = totalOriginalSize > 0 
    ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 
    : 0;
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <h4 className="font-medium text-green-900">Compresión completada</h4>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Tamaño original:</p>
          <p className="font-medium">{formatFileSize(totalOriginalSize)}</p>
        </div>
        <div>
          <p className="text-gray-600">Tamaño final:</p>
          <p className="font-medium">{formatFileSize(totalCompressedSize)}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <Zap className="h-3 w-3 mr-1" />
            Reducción: {totalReduction.toFixed(1)}%
          </Badge>
          {successCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              ✅ {successCount} exitosos
            </Badge>
          )}
          {failureCount > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-700">
              ❌ {failureCount} fallidos
            </Badge>
          )}
        </div>
      </div>
      
      {results.length <= 3 && (
        <div className="space-y-1">
          {results.map((result, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
                <span className="truncate max-w-32">{result.fileName}</span>
              </div>
              <span className="text-gray-500">
                -{result.compressionPercentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
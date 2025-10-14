'use client';

import { useEffect, useRef, useState } from 'react';
import { UbicacionConOperador } from '@/lib/ubicacion';

interface ModalUbicacionOperadorProps {
  isOpen: boolean;
  onClose: () => void;
  ubicacion: UbicacionConOperador | null;
  operatorNumber: string;
}

export default function ModalUbicacionOperador({
  isOpen,
  onClose,
  ubicacion,
  operatorNumber
}: ModalUbicacionOperadorProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} hrs`;

    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRefreshLocation = async () => {
    setIsRefreshing(true);
    
    try {
      const response = await fetch(`/api/ubicacion?operator_number=${operatorNumber}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Recargar la página para actualizar los datos
        window.location.reload();
      } else {
        alert('No se encontró ubicación actualizada');
      }
    } catch (error) {
      console.error('Error al actualizar ubicación:', error);
      alert('Error al actualizar la ubicación. Por favor, intenta de nuevo.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = () => {
    if (!ubicacion) {
      return (
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gray-400 text-white">
          🔴 Sin datos
        </span>
      );
    }

    const isRecent = (Date.now() - new Date(ubicacion.captured_at).getTime()) < 5 * 60 * 1000;
    
    if (isRecent) {
      return (
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
          🟢 Activo
        </span>
      );
    }
    
    return (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gray-500 text-white">
        🔴 Inactivo
      </span>
    );
  };

  const getMapUrl = () => {
    if (!ubicacion) {
      // Mapa estático de Ciudad de México por defecto
      return `https://www.openstreetmap.org/export/embed.html?bbox=-99.2,-19.5,-99.0,19.5&layer=mapnik&marker=19.432608,-99.133209`;
    }
    
    // Mapa de OpenStreetMap con la ubicación del operador
    const lat = ubicacion.latitude;
    const lng = ubicacion.longitude;
    const zoom = 15;
    
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`;
  };

  const openGoogleMaps = () => {
    if (!ubicacion) return;
    
    const url = `https://www.google.com/maps?q=${ubicacion.latitude},${ubicacion.longitude}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl animate-slideDown">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              📍 Ubicación del Operador {operatorNumber}
            </h2>
            <p className="text-sm text-orange-100">
              Sistema de monitoreo en tiempo real | Monarca 2025
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:scale-110 transition-transform text-4xl leading-none hover:rotate-90"
            style={{ transition: 'all 0.3s ease' }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Panel de información */}
          <div className="w-80 bg-gray-50 p-6 overflow-y-auto border-r">
            <div className="space-y-4">
              <div className="pb-4 border-b">
                <div className="text-xs font-bold text-gray-600 uppercase mb-2">
                  Operador
                </div>
                <div className="text-base font-semibold text-gray-800">
                  {ubicacion?.operador?.nombre || 'N/A'}{' '}
                  {ubicacion?.operador?.apellidos || ''}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  #{operatorNumber}
                </div>
                <div className="mt-2">
                  {getStatusBadge()}
                </div>
              </div>

              {ubicacion?.operador?.telefono && (
                <div className="pb-4 border-b">
                  <div className="text-xs font-bold text-gray-600 uppercase mb-2">
                    📞 Teléfono
                  </div>
                  <div className="text-sm text-gray-800">
                    {ubicacion.operador.telefono}
                  </div>
                </div>
              )}

              <div className="pb-4 border-b">
                <div className="text-xs font-bold text-gray-600 uppercase mb-2">
                  📍 Latitud
                </div>
                <div className="text-sm text-gray-800 font-mono">
                  {ubicacion?.latitude.toFixed(6) || 'N/A'}
                </div>
              </div>

              <div className="pb-4 border-b">
                <div className="text-xs font-bold text-gray-600 uppercase mb-2">
                  📍 Longitud
                </div>
                <div className="text-sm text-gray-800 font-mono">
                  {ubicacion?.longitude.toFixed(6) || 'N/A'}
                </div>
              </div>

              <div className="pb-4 border-b">
                <div className="text-xs font-bold text-gray-600 uppercase mb-2">
                  🕐 Última Actualización
                </div>
                <div className="text-sm text-gray-800">
                  {ubicacion
                    ? formatDate(new Date(ubicacion.captured_at))
                    : 'Sin datos'}
                </div>
              </div>

              <div className="pb-4 border-b">
                <div className="text-xs font-bold text-gray-600 uppercase mb-2">
                  📱 Dispositivo
                </div>
                <div className="text-xs text-gray-800 break-all">
                  {ubicacion?.device_id 
                    ? ubicacion.device_id.substring(0, 30) + (ubicacion.device_id.length > 30 ? '...' : '')
                    : 'No disponible'}
                </div>
              </div>

              {/* Botones */}
              <div className="space-y-2">
                <button
                  onClick={handleRefreshLocation}
                  disabled={isRefreshing}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                    isRefreshing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 active:scale-95'
                  }`}
                >
                  {isRefreshing ? '🔄 Actualizando...' : '🔄 Actualizar Ubicación'}
                </button>

                {ubicacion && (
                  <button
                    onClick={openGoogleMaps}
                    className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all"
                  >
                    🗺️ Abrir en Google Maps
                  </button>
                )}
              </div>

              {!ubicacion && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <div className="text-sm text-yellow-800">
                    ⚠️ El operador aún no ha enviado su ubicación desde la app móvil.
                  </div>
                  <div className="text-xs text-yellow-700 mt-2">
                    Mostrando ubicación por defecto en Ciudad de México.
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-xs text-blue-800">
                  ℹ️ <strong>Nota:</strong> Mapa temporal usando OpenStreetMap. 
                  Para usar Google Maps, activa la API en Google Cloud Console.
                </div>
              </div>
            </div>
          </div>

          {/* Mapa */}
          <div className="flex-1 relative">
            <iframe
              src={getMapUrl()}
              className="w-full h-full border-0"
              title="Mapa de ubicación del operador"
            />
            {ubicacion && (
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-md">
                <div className="text-sm">
                  <div className="font-bold text-orange-600 mb-2">
                    🚚 {ubicacion.operador?.nombre} {ubicacion.operador?.apellidos}
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>📋 Operador: #{operatorNumber}</div>
                    <div>📍 {ubicacion.latitude.toFixed(6)}, {ubicacion.longitude.toFixed(6)}</div>
                    <div>🕐 {formatDate(new Date(ubicacion.captured_at))}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideDown {
          from {
            transform: translateY(-50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

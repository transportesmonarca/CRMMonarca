'use client';

import { useEffect, useRef, useState } from 'react';
import { UbicacionConOperador } from '@/lib/ubicacion';

// Declarar tipos para Google Maps
declare global {
  interface Window {
    google: any;
  }
}

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
  console.log('🗺️  [MODAL] ====== ModalUbicacionOperador render ======');
  console.log('🗺️  [MODAL] isOpen:', isOpen);
  console.log('🗺️  [MODAL] operatorNumber:', operatorNumber);
  console.log('🗺️  [MODAL] ubicacion:', ubicacion);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [infoWindow, setInfoWindow] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Obtener la API key desde las variables de entorno
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  console.log('🗺️  [MODAL] API Key presente:', !!GOOGLE_MAPS_API_KEY);

  useEffect(() => {
    if (!isOpen) return;

    // Verificar que la API key esté configurada
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('⚠️ GOOGLE_MAPS_API_KEY no está configurada en .env.local');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (mapRef.current && window.google) {
        initializeMap();
      }
    };

    if (!window.google) {
      document.head.appendChild(script);
    } else {
      initializeMap();
    }

    return () => {
      if (marker) {
        marker.setMap(null);
      }
      if (infoWindow) {
        infoWindow.close();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (map && ubicacion) {
      updateMapLocation(ubicacion);
    } else if (map && !ubicacion) {
      showDefaultLocation();
    }
  }, [map, ubicacion]);

  const initializeMap = () => {
    console.log('🗺️  [MODAL] initializeMap llamado');
    console.log('🗺️  [MODAL] mapRef.current:', !!mapRef.current);
    console.log('🗺️  [MODAL] window.google:', !!window.google);
    
    if (!mapRef.current || !window.google) {
      console.error('❌ [MODAL] No se puede inicializar mapa - falta mapRef o Google Maps');
      return;
    }

    const defaultLocation = { lat: 19.432608, lng: -99.133209 };
    console.log('🗺️  [MODAL] Ubicación recibida en initializeMap:', ubicacion);
    
    const mapCenter = ubicacion 
      ? { lat: ubicacion.latitude, lng: ubicacion.longitude }
      : defaultLocation;
    console.log('🗺️  [MODAL] Centro del mapa:', mapCenter);
    
    const newMap = new window.google.maps.Map(mapRef.current, {
      zoom: ubicacion ? 15 : 13,
      center: mapCenter,
      mapTypeId: 'roadmap',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      fullscreenControl: true,
      streetViewControl: true,
      mapTypeControl: true,
      zoomControl: true
    });

    const newMarker = new window.google.maps.Marker({
      map: newMap,
      position: ubicacion
        ? { lat: ubicacion.latitude, lng: ubicacion.longitude }
        : defaultLocation,
      title: ubicacion 
        ? `${ubicacion.operador?.nombre || ''} ${ubicacion.operador?.apellidos || ''}`
        : `Sin ubicación - Operador ${operatorNumber}`,
      animation: window.google.maps.Animation.DROP,
      icon: ubicacion
        ? {
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new window.google.maps.Size(40, 40)
          }
        : {
            url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
            scaledSize: new window.google.maps.Size(40, 40)
          }
    });

    const newInfoWindow = new window.google.maps.InfoWindow();

    setMap(newMap);
    setMarker(newMarker);
    setInfoWindow(newInfoWindow);

    // Agregar listener al marcador
    newMarker.addListener('click', () => {
      if (ubicacion) {
        newInfoWindow.setContent(getInfoWindowContent(ubicacion));
      } else {
        newInfoWindow.setContent(getDefaultInfoWindowContent());
      }
      newInfoWindow.open(newMap, newMarker);
    });

    // Abrir info window automáticamente
    if (ubicacion) {
      newInfoWindow.setContent(getInfoWindowContent(ubicacion));
      newInfoWindow.open(newMap, newMarker);
    }
  };

  const showDefaultLocation = () => {
    if (!map || !marker || !infoWindow) return;

    const defaultLocation = { lat: 19.432608, lng: -99.133209 };
    
    map.setCenter(defaultLocation);
    map.setZoom(12);
    marker.setPosition(defaultLocation);
    marker.setIcon({
      url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
      scaledSize: new window.google.maps.Size(40, 40)
    });
    
    infoWindow.setContent(getDefaultInfoWindowContent());
    infoWindow.open(map, marker);
  };

  const updateMapLocation = (nuevaUbicacion: UbicacionConOperador) => {
    if (!map || !marker || !infoWindow) return;

    const position = {
      lat: nuevaUbicacion.latitude,
      lng: nuevaUbicacion.longitude
    };

    map.setCenter(position);
    map.setZoom(15);
    marker.setPosition(position);
    marker.setIcon({
      url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      scaledSize: new window.google.maps.Size(40, 40)
    });
    
    infoWindow.setContent(getInfoWindowContent(nuevaUbicacion));
    infoWindow.open(map, marker);
  };

  const getInfoWindowContent = (ubicacion: UbicacionConOperador) => {
    const isRecent = ubicacion 
      ? (Date.now() - new Date(ubicacion.captured_at).getTime()) < 5 * 60 * 1000
      : false;

    return `
      <div style="padding: 15px; max-width: 300px; font-family: 'Segoe UI', sans-serif;">
        <h3 style="margin: 0 0 12px 0; color: #FF6B35; font-size: 18px;">
          🚚 ${ubicacion.operador?.nombre || ''} ${ubicacion.operador?.apellidos || ''}
        </h3>
        <div style="border-bottom: 2px solid #FFB380; margin-bottom: 12px;"></div>
        <p style="margin: 8px 0; font-size: 14px;">
          <strong style="color: #333;">📋 Operador:</strong> 
          <span style="color: #666;">#${operatorNumber}</span>
        </p>
        ${ubicacion.operador?.telefono ? `
          <p style="margin: 8px 0; font-size: 14px;">
            <strong style="color: #333;">📞 Teléfono:</strong> 
            <span style="color: #666;">${ubicacion.operador.telefono}</span>
          </p>
        ` : ''}
        <p style="margin: 8px 0; font-size: 14px;">
          <strong style="color: #333;">📍 Coordenadas:</strong><br>
          <span style="color: #666; font-family: monospace; font-size: 12px;">
            ${ubicacion.latitude.toFixed(6)}, ${ubicacion.longitude.toFixed(6)}
          </span>
        </p>
        <p style="margin: 8px 0; font-size: 14px;">
          <strong style="color: #333;">🕐 Última actualización:</strong><br>
          <span style="color: #666; font-size: 12px;">
            ${formatDate(new Date(ubicacion.captured_at))}
          </span>
        </p>
        ${isRecent ? `
          <div style="margin-top: 12px; padding: 8px; background: #e8f5e9; border-radius: 6px; text-align: center;">
            <span style="color: #2e7d32; font-weight: bold; font-size: 12px;">
              🟢 ACTIVO - Actualizado recientemente
            </span>
          </div>
        ` : `
          <div style="margin-top: 12px; padding: 8px; background: #fff3e0; border-radius: 6px; text-align: center;">
            <span style="color: #e65100; font-weight: bold; font-size: 12px;">
              🟡 Ubicación no actualizada recientemente
            </span>
          </div>
        `}
      </div>
    `;
  };

  const getDefaultInfoWindowContent = () => {
    return `
      <div style="padding: 15px; max-width: 300px; font-family: 'Segoe UI', sans-serif;">
        <h3 style="margin: 0 0 12px 0; color: #999; font-size: 18px;">
          📍 Sin ubicación registrada
        </h3>
        <div style="border-bottom: 2px solid #ddd; margin-bottom: 12px;"></div>
        <p style="margin: 8px 0; font-size: 14px; color: #666;">
          El operador <strong>#${operatorNumber}</strong> aún no ha enviado su ubicación desde la app móvil.
        </p>
        <div style="margin-top: 12px; padding: 10px; background: #fff3e0; border-radius: 6px;">
          <p style="margin: 0; color: #e65100; font-size: 12px; text-align: center;">
            ⚠️ Ubicación por defecto: Ciudad de México
          </p>
        </div>
      </div>
    `;
  };

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
      // Recargar la ubicación desde la API
      const response = await fetch(`/api/ubicacion?operator_number=${operatorNumber}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Actualizar el mapa con la nueva ubicación
        updateMapLocation(data.data);
      }
    } catch (error) {
      console.error('Error al actualizar ubicación:', error);
      alert('Error al actualizar la ubicación. Por favor, intenta de nuevo.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

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

              {/* Botón de actualizar */}
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
            </div>
          </div>

          {/* Mapa */}
          <div className="flex-1 relative">
            <div ref={mapRef} className="w-full h-full" />
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

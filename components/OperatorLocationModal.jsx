import { useState, useEffect } from 'react';
import { Modal, Spin, Alert, Button } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const APP_SECRET = process.env.NEXT_PUBLIC_LOCATION_APP_SECRET || 'tu-secreto-aqui';
const API_URL = process.env.NEXT_PUBLIC_LOCATION_API_URL || 'http://localhost:3000';

export default function OperatorLocationModal({ operatorId, visible, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (visible && operatorId) {
      fetchLocation();
      // Actualizar cada 10 segundos mientras el modal esté abierto
      const interval = setInterval(fetchLocation, 10000);
      return () => clearInterval(interval);
    }
  }, [visible, operatorId]);

  const fetchLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/operator/${operatorId}/last`, {
        headers: {
          'Authorization': `Bearer ${APP_SECRET}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No se encontró ubicación reciente para este operador');
        }
        throw new Error('Error al obtener ubicación');
      }

      const data = await response.json();
      setLocation(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = () => {
    if (location) {
      const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Modal
      title={
        <span>
          <EnvironmentOutlined style={{ marginRight: 8 }} />
          Ubicación del Operador
        </span>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>,
        location && (
          <Button key="maps" type="primary" onClick={openInGoogleMaps}>
            Abrir en Google Maps
          </Button>
        ),
      ]}
    >
      {loading && !location && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Cargando ubicación...</p>
        </div>
      )}

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {location && (
        <>
          <div style={{ marginBottom: 16 }}>
            <p><strong>Operador ID:</strong> {location.operator_id}</p>
            {location.folio && <p><strong>Folio:</strong> {location.folio}</p>}
            {location.short_code && <p><strong>Código:</strong> {location.short_code}</p>}
            <p><strong>Última actualización:</strong> {new Date(location.captured_at).toLocaleString('es-MX')}</p>
            <p><strong>Coordenadas:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
          </div>

          {/* Mapa embebido de Google Maps */}
          <iframe
            width="100%"
            height="400"
            frameBorder="0"
            style={{ border: 0, borderRadius: 8 }}
            src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${location.latitude},${location.longitude}&zoom=16`}
            allowFullScreen
          />
        </>
      )}
    </Modal>
  );
}


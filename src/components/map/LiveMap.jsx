import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { formatDistance, haversine } from '../../services/geo';

const dot = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 2px ${color}66"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

const userIcon = dot('#2563eb');
const zoneIcon = dot('#16a34a');
const reportIcon = dot('#f59e0b');

function Follow({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 15), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.lat, pos?.lng]);
  return null;
}

export default function LiveMap({ pos, trail, zones = [], reports = [], height = 320 }) {
  const center = pos ? [pos.lat, pos.lng] : [20.5937, 78.9629];
  return (
    <div className="overflow-hidden rounded-2xl border border-line" style={{ height }}>
      <MapContainer center={center} zoom={pos ? 15 : 4} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains={['a', 'b', 'c']}
          attribution="&copy; OpenStreetMap contributors"
          crossOrigin
        />
        {pos && (
          <>
            <Marker position={center} icon={userIcon} />
            {pos.accuracy > 0 && <Circle center={center} radius={pos.accuracy} pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.12 }} />}
            <Follow pos={pos} />
          </>
        )}
        {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#e11d48', weight: 4 }} />}
        {zones.map((z) => (
          <Marker key={z.id} position={[z.lat, z.lng]} icon={zoneIcon}>
            <Popup>
              <b>{z.name}</b>
              <br />
              {z.category}
              {pos && (
                <>
                  <br />
                  {formatDistance(haversine(pos, z))}
                </>
              )}
            </Popup>
          </Marker>
        ))}
        {reports.filter((r) => r.pos).map((r) => (
          <Marker key={r.id} position={[r.pos.lat, r.pos.lng]} icon={reportIcon}>
            <Popup>
              Safe score {r.score}/10
              <br />
              Lighting {r.lighting}/5 · Crowd {r.crowd}/5
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

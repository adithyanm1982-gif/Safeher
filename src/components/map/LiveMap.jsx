import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { formatDistance, haversine } from '../../services/geo';
import { useApp } from '../../context/AppContext';
import { CAT_KEY, zoneName } from '../../services/i18n';

const dot = (color, size = 16) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 2px ${color}66"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });

const zoneIcon = dot('#16a34a');
const reportIcon = dot('#f59e0b');
const resultIcon = dot('#16a34a', 20);
const destIcon = dot('#e11d48', 22);

function userIcon(heading) {
  const cone =
    heading == null
      ? ''
      : `<div style="position:absolute;left:20px;top:20px;width:0;height:0;transform:rotate(${heading}deg)"><div style="position:absolute;left:-14px;top:-36px;width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:28px solid rgba(37,99,235,.45)"></div></div>`;
  return L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `<div style="position:relative;width:40px;height:40px">${cone}<div style="position:absolute;left:12px;top:12px;width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.5)"></div></div>`
  });
}

function Controller({ pos, following, flyKey, focus, onDrag, onLongPress }) {
  const map = useMap();
  const first = useRef(true);

  useMapEvents({
    dragstart: () => onDrag && onDrag(),
    contextmenu: (e) => onLongPress && onLongPress({ lat: e.latlng.lat, lng: e.latlng.lng })
  });

  useEffect(() => {
    if (!pos) return;
    if (first.current) {
      first.current = false;
      map.setView([pos.lat, pos.lng], 16, { animate: false });
    } else if (following) {
      map.panTo([pos.lat, pos.lng], { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.lat, pos?.lng, following]);

  useEffect(() => {
    if (flyKey && pos) map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyKey]);

  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], 17, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.k]);

  return null;
}

export default function LiveMap({
  pos, heading, trail, zones = [], reports = [], results = [], destination,
  following, flyKey, focus, onDrag, onLongPress
}) {
  const { t } = useApp();
  const center = pos ? [pos.lat, pos.lng] : [20.5937, 78.9629];
  const h = heading == null ? null : Math.round(heading / 5) * 5;
  const icon = useMemo(() => userIcon(h), [h]);
  const shownIds = new Set(results.map((r) => r.id));
  const cat = (z) => t(CAT_KEY[z.category] || 'cat_other');

  return (
    <MapContainer center={center} zoom={pos ? 16 : 4} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" subdomains={['a', 'b', 'c']} crossOrigin />
      <Controller pos={pos} following={following} flyKey={flyKey} focus={focus} onDrag={onDrag} onLongPress={onLongPress} />
      {pos && (
        <>
          <Marker position={center} icon={icon} zIndexOffset={1000} />
          {pos.accuracy > 0 && <Circle center={center} radius={pos.accuracy} pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.12 }} />}
        </>
      )}
      {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#e11d48', weight: 4 }} />}
      {destination && pos && (
        <Polyline positions={[center, [destination.lat, destination.lng]]} pathOptions={{ color: '#2563eb', weight: 4, dashArray: '8 8' }} />
      )}
      {destination && <Marker position={[destination.lat, destination.lng]} icon={destIcon} />}
      {zones.filter((z) => !shownIds.has(z.id)).map((z) => (
        <Marker key={z.id} position={[z.lat, z.lng]} icon={zoneIcon}>
          <Popup><b>{zoneName(t, z)}</b><br />{cat(z)}{pos && <><br />{formatDistance(haversine(pos, z))}</>}</Popup>
        </Marker>
      ))}
      {results.map((z) => (
        <Marker key={z.id} position={[z.lat, z.lng]} icon={resultIcon} zIndexOffset={500}>
          <Popup><b>{zoneName(t, z)}</b><br />{cat(z)}<br />{t('away', { dist: formatDistance(z.dist) })}</Popup>
        </Marker>
      ))}
      {reports.filter((r) => r.pos).map((r) => (
        <Marker key={r.id} position={[r.pos.lat, r.pos.lng]} icon={reportIcon}>
          <Popup>{t('safeScoreOf', { s: r.score })}<br />{t('lightCrowd', { l: r.lighting, c: r.crowd })}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
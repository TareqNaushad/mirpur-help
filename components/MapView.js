"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons (Leaflet + bundlers don't resolve these by default).
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Centre of Mirpur, Dhaka.
const MIRPUR_CENTER = [23.8069, 90.3686];

export default function MapView({ services }) {
  const first = services[0];
  const center = first ? [first.lat, first.lng] : MIRPUR_CENTER;

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {services.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={icon}>
          <Popup>
            <strong>{s.nameBn}</strong>
            <br />
            {s.nameEn}
            <br />
            📍 {s.area}
            {s.phone && (
              <>
                <br />
                📞 <a href={`tel:${s.phone}`}>{s.phone}</a>
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

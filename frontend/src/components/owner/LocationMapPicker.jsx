import React from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pointerIcon = L.icon({
  iconUrl: `data:image/svg+xml,%3Csvg width='48' height='72' viewBox='0 0 48 72' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%' x2='0%' y1='0%' y2='100%'%3E%3Cstop offset='0%' stop-color='%230ea5e9'/%3E%3Cstop offset='100%' stop-color='%230284c7'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M24 0C12.3 0 2.8 9.5 2.8 21.2c0 14.1 16.6 33.1 20 38.1a2 2 0 0 0 3.4 0c3.4-5 20-24 20-38.1C45.2 9.5 35.7 0 24 0Z' fill='url(%23g)'/%3E%3Ccircle cx='24' cy='22' r='8' fill='white'/%3E%3C/svg%3E`,
  iconSize: [36, 54],
  iconAnchor: [18, 52],
  popupAnchor: [0, -32],
});

const ClickHandler = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
};

const ViewUpdater = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center?.[0] && center?.[1]) {
      map.flyTo(center, map.getZoom(), { duration: 0.6 });
    }
  }, [center, map]);
  return null;
};

const LocationMapPicker = ({
  value,
  radius = 200,
  onChange,
  className = "",
  zoom = 18,
  children,
}) => {
  const defaultCenter = [-7.779071, 110.416098];
  const center = React.useMemo(() => {
    if (value?.lat && value?.lng) {
      return [value.lat, value.lng];
    }
    // Lokasi default: -7.779071, 110.416098.
    return defaultCenter;
  }, [value]);

  return (
    <div className={["space-y-3", className].join(" ")}>
      <div className="relative rounded-2xl border border-border overflow-hidden">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: 340 }}
          scrollWheelZoom
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ViewUpdater center={center} />
          {value?.lat && value?.lng && (
            <>
              <Marker
                position={[value.lat, value.lng]}
                icon={pointerIcon}
                draggable
                eventHandlers={{
                  dragend: (event) => {
                    const latlng = event.target.getLatLng();
                    onChange({ lat: latlng.lat, lng: latlng.lng });
                  },
                }}
              />
              <Circle
                center={[value.lat, value.lng]}
                radius={Math.max(10, radius)}
                pathOptions={{
                  color: "#0284c7",
                  fillColor: "#0ea5e9",
                  fillOpacity: 0.15,
                }}
              />
            </>
          )}
          <ClickHandler
            onSelect={(latlng) => {
              onChange({ lat: latlng.lat, lng: latlng.lng });
            }}
          />
        </MapContainer>
        {children && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">{children}</div>
        )}
      </div>
    </div>
  );
};

export default LocationMapPicker;

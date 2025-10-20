import * as L from 'leaflet';
import { StationMeasurement } from '../../../../core/models/weather.models';
import { LayerRenderer } from '../layer-renderer';

type WindRendererPayload = {
  stations: StationMeasurement[];
  selectedStationId: string | null;
  onStationSelect: (stationId: string) => void;
};

export class WindRenderer implements LayerRenderer<WindRendererPayload> {
  private map: L.Map | null = null;
  private layer: L.LayerGroup | null = null;
  private markers = new Map<string, L.Marker>();

  init(map: L.Map): void {
    this.map = map;
    if (!this.layer) {
      this.layer = L.layerGroup().addTo(map);
    }
  }

  render(payload: WindRendererPayload): void {
    if (!this.map || !this.layer) {
      return;
    }

    const validStations = payload.stations.filter((station) =>
      typeof station.windSpeed === 'number' && Number.isFinite(station.windSpeed ?? NaN),
    );

    const seen = new Set<string>();

    validStations.forEach((station) => {
      const marker = this.upsertMarker(station, payload.onStationSelect);
      marker.getElement()?.classList.toggle('is-selected', payload.selectedStationId === station.id);
      seen.add(station.id);
    });

    this.markers.forEach((marker, id) => {
      if (!seen.has(id)) {
        this.layer?.removeLayer(marker);
        this.markers.delete(id);
      }
    });
  }

  onViewChange(): void {
    // Wind markers do not depend on view changes beyond standard marker positioning.
  }

  clear(): void {
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();
    this.layer?.clearLayers();
  }

  destroy(): void {
    this.clear();
    this.layer?.remove();
    this.layer = null;
    this.map = null;
  }

  private upsertMarker(
    station: StationMeasurement,
    onStationSelect: (stationId: string) => void,
  ): L.Marker {
    const existing = this.markers.get(station.id);
    const icon = this.createWindIcon(station);

    if (existing) {
      existing.setLatLng([station.latitude, station.longitude]);
      existing.setIcon(icon);
      return existing;
    }

    const marker = L.marker([station.latitude, station.longitude], {
      icon,
      interactive: true,
    }).on('click', () => onStationSelect(station.id));

    this.layer?.addLayer(marker);
    this.markers.set(station.id, marker);
    return marker;
  }

  private createWindIcon(station: StationMeasurement): L.DivIcon {
    const speed = station.windSpeed ?? 0;
    const direction = station.windDirection ?? 0;
    const gust = station.windGusts ?? speed;
    const label = `${speed.toFixed(1)} m/s`;
    return L.divIcon({
      className: 'weather-marker measurement-wind',
      html: `
        <div
          class="marker wind-marker"
          style="--wind-rotation: ${direction}deg; --wind-speed: ${Math.min(gust, 25)}"
        >
          <div class="wind-arrow"></div>
          <span class="marker-value">${label}</span>
        </div>
      `,
      iconSize: [60, 60],
      iconAnchor: [30, 30],
    });
  }
}

import * as L from 'leaflet';
import { StationMeasurement } from '../../../../core/models/weather.models';
import { LayerRenderer } from '../layer-renderer';
import { normalize, pressureToRgb, rgbToCss } from '../../utils/color.utils';

type PressureRendererPayload = {
  stations: StationMeasurement[];
  selectedStationId: string | null;
  range: [number, number] | null;
  onStationSelect: (stationId: string) => void;
};

export class PressureRenderer implements LayerRenderer<PressureRendererPayload> {
  private map: L.Map | null = null;
  private layer: L.LayerGroup | null = null;
  private markers = new Map<string, L.Marker>();

  init(map: L.Map): void {
    this.map = map;
    if (!this.layer) {
      this.layer = L.layerGroup().addTo(map);
    }
  }

  render(payload: PressureRendererPayload): void {
    if (!this.map || !this.layer) {
      return;
    }

    const validStations = payload.stations.filter(
      (station) =>
        typeof station.airPressure === 'number' && Number.isFinite(station.airPressure ?? NaN),
    );

    const seen = new Set<string>();

    validStations.forEach((station) => {
      const marker = this.upsertMarker(station, payload.range, payload.onStationSelect);
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
    // Pressure markers are static icons; no special handling required on view change.
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
    range: [number, number] | null,
    onStationSelect: (stationId: string) => void,
  ): L.Marker {
    const existing = this.markers.get(station.id);
    const icon = this.createPressureIcon(station, range);

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

  private createPressureIcon(station: StationMeasurement, range: [number, number] | null): L.DivIcon {
    const pressure = station.airPressure ?? NaN;
    const label = Number.isFinite(pressure) ? `${pressure.toFixed(0)} hPa` : '--';
    const size = this.resolveSize(pressure, range);
    const rgb = pressureToRgb(pressure);
    const color = rgbToCss(rgb);
    return L.divIcon({
      className: 'weather-marker measurement-pressure',
      html: `
        <div class="marker pressure-marker" style="--bubble-size: ${size}px; --bubble-color: ${color}">
          <div class="pressure-circle"></div>
          <span class="marker-value">${label}</span>
        </div>
      `,
      iconSize: [size + 30, size + 30],
      iconAnchor: [Math.round((size + 30) / 2), Math.round((size + 30) / 2)],
    });
  }

  private resolveSize(value: number, range: [number, number] | null): number {
    if (!Number.isFinite(value) || !range) {
      return 44;
    }
    const [min, max] = range;
    const ratio = normalize(value, min, max);
    return 20 + ratio * 24;
  }
}

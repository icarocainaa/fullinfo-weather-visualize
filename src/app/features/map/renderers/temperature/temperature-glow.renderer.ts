import * as L from 'leaflet';
import { StationMeasurement } from '../../../../core/models/weather.models';
import { LayerRenderer } from '../layer-renderer';
import { temperatureToRgb, rgbToCss } from '../../utils/color.utils';

type TemperatureRendererPayload = {
  stations: StationMeasurement[];
  selectedStationId: string | null;
  range: [number, number] | null;
  onStationSelect: (stationId: string) => void;
};

export class TemperatureGlowRenderer implements LayerRenderer<TemperatureRendererPayload> {
  private map: L.Map | null = null;
  private markerLayer: L.LayerGroup | null = null;
  private markers = new Map<string, L.Marker>();
  private overlay: GlowTemperatureOverlay | null = null;
  private lastPayload: TemperatureRendererPayload | null = null;

  init(map: L.Map): void {
    this.map = map;
    if (!this.markerLayer) {
      this.markerLayer = L.layerGroup().addTo(map);
    }
  }

  render(payload: TemperatureRendererPayload): void {
    if (!this.map || !this.markerLayer) {
      return;
    }

    this.lastPayload = payload;

    const validStations = payload.stations.filter((station) =>
      typeof station.temperature === 'number' && Number.isFinite(station.temperature ?? NaN),
    );

    this.updateOverlay(validStations, payload.range);
    this.syncMarkers(validStations, payload);
  }

  onViewChange(): void {
    if (!this.lastPayload) {
      return;
    }
    const { stations, range } = this.lastPayload;
    const validStations = stations.filter((station) =>
      typeof station.temperature === 'number' && Number.isFinite(station.temperature ?? NaN),
    );
    this.updateOverlay(validStations, range);
  }

  clear(): void {
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();
    this.markerLayer?.clearLayers();
    this.overlay?.destroy();
    this.overlay = null;
    this.lastPayload = null;
  }

  destroy(): void {
    this.clear();
    this.markerLayer?.remove();
    this.markerLayer = null;
    this.map = null;
  }

  private syncMarkers(stations: StationMeasurement[], payload: TemperatureRendererPayload): void {
    const seen = new Set<string>();
    const range = payload.range;

    stations.forEach((station) => {
      const temperature = typeof station.temperature === 'number' ? station.temperature : null;
      const rgb = temperatureToRgb(temperature, range);
      const color = rgbToCss(rgb);
      const marker = this.upsertMarker(station, color, payload.onStationSelect);
      marker.getElement()?.classList.toggle('is-selected', payload.selectedStationId === station.id);
      seen.add(station.id);
    });

    this.markers.forEach((marker, id) => {
      if (!seen.has(id)) {
        this.markerLayer?.removeLayer(marker);
        this.markers.delete(id);
      }
    });
  }

  private upsertMarker(
    station: StationMeasurement,
    color: string,
    onStationSelect: (stationId: string) => void,
  ): L.Marker {
    const existing = this.markers.get(station.id);
    const icon = this.createFlagIcon(color, station.temperature);

    if (existing) {
      existing.setLatLng([station.latitude, station.longitude]);
      existing.setIcon(icon);
      return existing;
    }

    const marker = L.marker([station.latitude, station.longitude], {
      icon,
      interactive: true,
    }).on('click', () => onStationSelect(station.id));

    this.markerLayer?.addLayer(marker);
    this.markers.set(station.id, marker);
    return marker;
  }

  private createFlagIcon(color: string, temperature?: number | null): L.DivIcon {
    const label = typeof temperature === 'number' ? `${temperature.toFixed(1)}&deg;` : '--';
    return L.divIcon({
      className: 'weather-marker measurement-temperature style-flag',
      html: `
        <div class="marker temperature-marker flag-mode" style="--marker-color: ${color}">
          <div class="flag-pole"></div>
          <div class="flag-body">
            <span class="marker-value">${label}</span>
          </div>
        </div>
      `,
      iconSize: [64, 44],
      iconAnchor: [12, 30],
    });
  }

  private updateOverlay(stations: StationMeasurement[], range: [number, number] | null): void {
    if (!this.map) {
      return;
    }

    if (!stations.length || !range) {
      this.overlay?.destroy();
      this.overlay = null;
      return;
    }

    if (!this.overlay) {
      this.overlay = GlowTemperatureOverlay.create(this.map);
      if (!this.overlay) {
        return;
      }
    }

    const overlayPoints = stations
      .map((station) => ({ station, temperature: station.temperature as number }))
      .filter((point) => Number.isFinite(point.temperature));

    this.overlay.update({
      stations: overlayPoints,
      colorize: (value) => temperatureToRgb(value, range),
    });
  }
}

type GlowOverlayPayload = {
  stations: TemperaturePoint[];
  colorize: (value: number) => [number, number, number];
};

type TemperaturePoint = { station: StationMeasurement; temperature: number };

class GlowTemperatureOverlay {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private destroyed = false;

  private constructor(private readonly map: L.Map, pane: HTMLElement) {
    this.canvas = L.DomUtil.create('canvas', 'glow-temperature-overlay', pane) as HTMLCanvasElement;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.opacity = '1';
    this.canvas.style.mixBlendMode = 'screen';

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.positionCanvas();
  }

  static create(map: L.Map): GlowTemperatureOverlay | null {
    const pane = map.getPane('temperature') ?? map.getPanes()?.overlayPane ?? null;
    if (!pane) {
      return null;
    }
    const overlay = new GlowTemperatureOverlay(map, pane);
    if (!overlay.ctx) {
      overlay.destroy();
      return null;
    }
    return overlay;
  }

  update(payload: GlowOverlayPayload): void {
    if (this.destroyed || !this.ctx) {
      return;
    }

    this.positionCanvas();
    this.resizeCanvas();

    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.65;

    const zoom = this.map.getZoom();
    const baseRadius = 120;
    const zoomScale = Math.pow(2, (zoom - 7) * 0.25);
    const radiusPx = Math.max(50, Math.min(260, baseRadius * zoomScale));

    payload.stations.forEach(({ station, temperature }) => {
      const position = this.map.latLngToContainerPoint([station.latitude, station.longitude]);
      if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
        return;
      }
      const [r, g, b] = payload.colorize(temperature);
      const gradient = ctx.createRadialGradient(
        position.x,
        position.y,
        0,
        position.x,
        position.y,
        radiusPx,
      );
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.45)`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.18)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.beginPath();
      ctx.arc(position.x, position.y, radiusPx, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    });

    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }

  private resizeCanvas(): void {
    const size = this.map.getSize();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(size.x * dpr));
    const height = Math.max(1, Math.round(size.y * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.canvas.style.width = `${size.x}px`;
    this.canvas.style.height = `${size.y}px`;
  }

  private positionCanvas(): void {
    const topLeft = this.map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this.canvas, topLeft);
  }
}

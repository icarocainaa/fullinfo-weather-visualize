import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  computed,
  effect,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  MeasurementLayer,
  StationMeasurement,
} from '../../../core/models/weather.models';
import * as L from 'leaflet';
import { LayerRenderer } from '../renderers/layer-renderer';
import { TemperatureGlowRenderer } from '../renderers/temperature/temperature-glow.renderer';
import { WindRenderer } from '../renderers/wind/wind.renderer';
import { PressureRenderer } from '../renderers/pressure/pressure-bubbles.renderer';

interface TemperatureRangePayload {
  stations: StationMeasurement[];
  selectedStationId: string | null;
  range: [number, number] | null;
  onStationSelect: (stationId: string) => void;
}

interface WindPayload {
  stations: StationMeasurement[];
  selectedStationId: string | null;
  onStationSelect: (stationId: string) => void;
}

interface PressurePayload {
  stations: StationMeasurement[];
  selectedStationId: string | null;
  range: [number, number] | null;
  onStationSelect: (stationId: string) => void;
}

@Component({
  selector: 'app-weather-map',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './weather-map.component.html',
  styleUrl: './weather-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WeatherMapComponent implements AfterViewInit, OnDestroy {
  readonly stationsInput = input<StationMeasurement[]>([], {
    alias: 'stations',
  });
  readonly measurementInput = input<MeasurementLayer>('temperature', {
    alias: 'measurement',
  });
  readonly selectedStationIdInput = input<string | null>(null, {
    alias: 'selectedStationId',
  });
  readonly loadingInput = input<boolean>(false, { alias: 'loading' });
  readonly lastUpdatedInput = input<string | null>(null, {
    alias: 'lastUpdated',
  });
  @Output() stationSelected = new EventEmitter<string | null>();

  @ViewChild('mapCanvas', { static: true })
  private mapCanvas?: ElementRef<HTMLDivElement>;

  readonly temperatureRange = signal<[number, number] | null>(null);
  readonly windRange = signal<[number, number] | null>(null);
  readonly pressureRange = signal<[number, number] | null>(null);
  readonly hasData = computed(() => this.stationsInput().length > 0);
  readonly measurement = computed(() => this.measurementInput());
  readonly loading = computed(() => this.loadingInput());

  private map: L.Map | null = null;
  private attributionControl: L.Control.Attribution | null = null;
  private readonly mapReady = signal(false);
  private readonly layerRenderers: Record<
    MeasurementLayer,
    LayerRenderer<unknown>
  > = {
    temperature: new TemperatureGlowRenderer(),
    wind: new WindRenderer(),
    pressure: new PressureRenderer(),
  };
  private readonly initializedRenderers = new Set<MeasurementLayer>();
  private activeMeasurement: MeasurementLayer | null = null;
  private latestStations: StationMeasurement[] = [];
  private readonly dutchPressureRange: [number, number] = [980, 1045]; // Typical sea-level pressure spread for NL.
  private readonly pressureHalfSpan = 5; // Maintain a 15 hPa window around observed midpoint.

  private readonly handleMapViewChange = () => {
    if (!this.mapReady()) {
      return;
    }
    const layer = this.activeMeasurement;
    if (layer) {
      this.layerRenderers[layer]?.onViewChange();
    }
  };

  constructor() {
    effect(() => {
      if (!this.mapReady()) {
        return;
      }
      const stations = this.stationsInput();
      this.renderStations(stations);
    });

    effect(() => {
      if (!this.mapReady()) {
        return;
      }
      const measurement = this.measurement();
      this.switchMeasurement(measurement);
    });

    effect(() => {
      if (!this.mapReady()) {
        return;
      }
      // React to selection changes by re-rendering the active layer.
      this.selectedStationIdInput();
      this.renderActiveLayer();
    });

    effect(() => {
      if (!this.mapReady() || !this.attributionControl) {
        return;
      }
      const lastUpdated = this.lastUpdatedInput();
      this.updateAttribution(lastUpdated);
    });
  }

  ngAfterViewInit(): void {
    if (!this.mapCanvas) {
      return;
    }

    this.map = L.map(this.mapCanvas.nativeElement, {
      zoomControl: true,
      preferCanvas: true,
      attributionControl: false,
    }).setView([52.1, 5.29], 8);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      maxZoom: 16,
      minZoom: 5,
      subdomains: 'abcd',
      attribution: '',
    }).addTo(this.map);

    this.map.createPane('temperature');
    this.map.createPane('wind');
    this.map.createPane('pressure');
    this.map.getPane('temperature')?.classList.add('temperature-pane');
    this.map.getPane('wind')?.classList.add('wind-pane');
    this.map.getPane('pressure')?.classList.add('pressure-pane');

    this.attributionControl = L.control.attribution({
      position: 'bottomright',
    });
    this.attributionControl.addTo(this.map);
    this.updateAttribution(this.lastUpdatedInput());

    (['moveend', 'zoomend', 'resize'] as const).forEach((event) =>
      this.map?.on(event, this.handleMapViewChange)
    );

    this.mapReady.set(true);
  }

  ngOnDestroy(): void {
    this.mapReady.set(false);
    Object.values(this.layerRenderers).forEach((renderer) =>
      renderer.destroy()
    );
    if (this.map) {
      (['moveend', 'zoomend', 'resize'] as const).forEach((event) =>
        this.map?.off(event, this.handleMapViewChange)
      );
      this.map.remove();
    }
    this.map = null;
    this.attributionControl = null;
    this.latestStations = [];
  }

  private updateAttribution(lastUpdated: string | null): void {
    const container = this.attributionControl?.getContainer();
    if (!container) {
      return;
    }

    if (lastUpdated) {
      const date = new Date(lastUpdated);
      const timeString = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      container.innerHTML = `<span class="map-updated-time">Updated ${timeString}</span>`;
    } else {
      container.innerHTML = '';
    }
  }

  private renderStations(stations: StationMeasurement[]): void {
    this.latestStations = stations;
    this.updateRanges(stations);
    this.renderActiveLayer();
  }

  private switchMeasurement(layer: MeasurementLayer): void {
    if (!this.map) {
      return;
    }

    if (this.activeMeasurement && this.activeMeasurement !== layer) {
      this.layerRenderers[this.activeMeasurement]?.clear();
    }

    if (!this.initializedRenderers.has(layer)) {
      this.layerRenderers[layer].init(this.map);
      this.initializedRenderers.add(layer);
    }

    this.activeMeasurement = layer;
    this.renderActiveLayer();
  }

  private renderActiveLayer(): void {
    if (!this.mapReady()) {
      return;
    }

    const layer = this.activeMeasurement ?? this.measurement();
    const stations = this.latestStations;

    switch (layer) {
      case 'temperature': {
        const renderer = this.layerRenderers
          .temperature as TemperatureGlowRenderer;
        renderer.render(this.buildTemperaturePayload(stations));
        break;
      }
      case 'wind': {
        const renderer = this.layerRenderers.wind as WindRenderer;
        renderer.render(this.buildWindPayload(stations));
        break;
      }
      case 'pressure': {
        const renderer = this.layerRenderers.pressure as PressureRenderer;
        renderer.render(this.buildPressurePayload(stations));
        break;
      }
      default:
        break;
    }
  }

  private buildTemperaturePayload(
    stations: StationMeasurement[]
  ): TemperatureRangePayload {
    return {
      stations,
      selectedStationId: this.selectedStationIdInput(),
      range: this.temperatureRange(),
      onStationSelect: (stationId: string) =>
        this.stationSelected.emit(stationId),
    };
  }

  private buildWindPayload(stations: StationMeasurement[]): WindPayload {
    return {
      stations,
      selectedStationId: this.selectedStationIdInput(),
      onStationSelect: (stationId: string) =>
        this.stationSelected.emit(stationId),
    };
  }

  private buildPressurePayload(
    stations: StationMeasurement[]
  ): PressurePayload {
    return {
      stations,
      selectedStationId: this.selectedStationIdInput(),
      range: this.pressureRange(),
      onStationSelect: (stationId: string) =>
        this.stationSelected.emit(stationId),
    };
  }

  private updateRanges(stations: StationMeasurement[]): void {
    this.temperatureRange.set(this.computeTemperatureRange(stations));
    this.windRange.set(
      this.computeRange(stations, (station) => station.windSpeed)
    );
    this.pressureRange.set(this.computePressureRange(stations));
  }

  private computeRange(
    stations: StationMeasurement[],
    selector: (station: StationMeasurement) => number | null | undefined
  ): [number, number] | null {
    const values = stations
      .map(selector)
      .filter(
        (value): value is number =>
          typeof value === 'number' && Number.isFinite(value)
      );
    if (!values.length) {
      return null;
    }
    return [Math.min(...values), Math.max(...values)];
  }

  private computeTemperatureRange(
    stations: StationMeasurement[]
  ): [number, number] | null {
    const rawRange = this.computeRange(
      stations,
      (station) => station.temperature
    );
    if (!rawRange) {
      return null;
    }
    const [minValue, maxValue] = rawRange;
    const midPoint = (minValue + maxValue) / 2;
    const padding = 4;
    return [midPoint - padding, midPoint + padding];
  }

  private computePressureRange(
    stations: StationMeasurement[]
  ): [number, number] {
    const measuredRange = this.computeRange(
      stations,
      (station) => station.airPressure
    );
    if (!measuredRange) {
      const [defaultMin, defaultMax] = this.dutchPressureRange;
      const midPoint = (defaultMin + defaultMax) / 2;
      const halfSpan = this.pressureHalfSpan;
      return [midPoint - halfSpan, midPoint + halfSpan];
    }
    const [minValue, maxValue] = measuredRange;
    const midPoint = (minValue + maxValue) / 2;
    const halfSpan = this.pressureHalfSpan;
    return [midPoint - halfSpan, midPoint + halfSpan];
  }
}

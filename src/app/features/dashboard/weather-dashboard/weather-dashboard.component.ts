import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { WeatherMapComponent } from '../../map/weather-map/weather-map.component';
import { WeatherPanelComponent } from '../../panel/weather-panel/weather-panel.component';
import { MeasurementLayer } from '../../../core/models/weather.models';
import { WeatherStore } from '../../../core/store/weather.store';

@Component({
  selector: 'app-weather-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatProgressBarModule,
    WeatherMapComponent,
    WeatherPanelComponent,
  ],
  templateUrl: './weather-dashboard.component.html',
  styleUrl: './weather-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherDashboardComponent {
  private readonly store = inject(WeatherStore);

  readonly weather = this.store.weather;
  readonly stations = this.store.stations;
  readonly measurement = this.store.measurementLayer;
  readonly selectedStation = this.store.selectedStation;
  readonly selectedStationId = computed(() => this.store.selectedStationId());
  readonly lastUpdated = this.store.lastUpdated;
  readonly isLoading = this.store.isLoading;

  readonly measurementOptions: Array<{
    value: MeasurementLayer;
    label: string;
    icon: string;
  }> = [
    { value: 'temperature', label: 'Temperature', icon: 'device_thermostat' },
    { value: 'wind', label: 'Wind flow', icon: 'air' },
    { value: 'pressure', label: 'Air pressure', icon: 'speed' },
  ];

  readonly today = computed(() => this.weather()?.today ?? null);
  readonly forecast = computed(() => this.weather()?.forecast ?? []);

  readonly minOpacity = (value: number, max: number) => {
    const clampedValue = Number.isFinite(value) ? value : 0;
    const clampedMax = Number.isFinite(max) ? max : 1;
    return Math.min(Math.max(clampedValue, 0.2), clampedMax);
  };

  constructor() {
    effect(() => {
      const currentStations = this.stations();
      const currentSelection = this.store.selectedStationId();
      if (currentStations.length && !currentSelection) {
        this.store.selectStation(currentStations[0].id);
      }
    });
  }

  handleMeasurementChange(layer: MeasurementLayer) {
    if (layer === this.measurement()) {
      return;
    }
    this.store.setMeasurement(layer);
  }

  handleStationSelected(stationId: string | null) {
    const current = this.selectedStationId();
    if (current && stationId === current) {
      this.store.selectStation(null);
      return;
    }
    this.store.selectStation(stationId);
  }

  refresh() {
    void this.store.refresh();
  }
}

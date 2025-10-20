import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WeatherDataService } from '../services/weather-data.service';
import { MeasurementLayer, WeatherData } from '../models/weather.models';

@Injectable({
  providedIn: 'root',
})
export class WeatherStore {
  private readonly dataService = inject(WeatherDataService);
  private readonly weatherState = toSignal<WeatherData | null>(this.dataService.watchWeather(), {
    initialValue: null,
  });

  readonly weather = computed(() => this.weatherState());
  readonly lastUpdated = computed(() => this.weather()?.generatedAt ?? null);
  readonly isLoading = computed(() => this.weatherState() === null);
  readonly measurementLayer = signal<MeasurementLayer>('temperature');
  readonly selectedStationId = signal<string | null>(null);

  readonly stations = computed(() => this.weather()?.stations ?? []);
  readonly selectedStation = computed(() => {
    const id = this.selectedStationId();
    if (!id) {
      return null;
    }
    return this.stations().find((station) => station.id === id) ?? null;
  });

  setMeasurement(layer: MeasurementLayer) {
    this.measurementLayer.set(layer);
  }

  selectStation(stationId: string | null) {
    this.selectedStationId.set(stationId);
  }

  async refresh(): Promise<void> {
    await this.dataService.refresh();
  }
}

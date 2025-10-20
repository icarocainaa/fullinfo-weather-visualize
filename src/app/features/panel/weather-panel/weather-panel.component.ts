import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  MeasurementLayer,
  StationMeasurement,
  TodayOverview,
} from '../../../core/models/weather.models';

@Component({
  selector: 'app-weather-panel',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatExpansionModule,
  ],
  templateUrl: './weather-panel.component.html',
  styleUrl: './weather-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherPanelComponent {
  private readonly sanitizer = inject(DomSanitizer);

  private readonly todaySignal = signal<TodayOverview | null>(null);
  private readonly selectedStationSignal = signal<StationMeasurement | null>(
    null
  );
  private readonly measurementSignal = signal<MeasurementLayer>('temperature');
  private readonly lastUpdatedSignal = signal<string | null>(null);

  readonly today = computed(() => this.todaySignal());
  readonly selectedStation = computed(() => this.selectedStationSignal());
  readonly measurement = computed(() => this.measurementSignal());
  readonly lastUpdated = computed(() => this.lastUpdatedSignal());

  @Input()
  set todayData(value: TodayOverview | null) {
    this.todaySignal.set(value);
  }

  @Input()
  set selectedStationData(value: StationMeasurement | null) {
    this.selectedStationSignal.set(value);
  }

  @Input()
  set measurementLayer(value: MeasurementLayer) {
    this.measurementSignal.set(value);
  }

  @Input()
  set lastUpdatedAt(value: string | null) {
    this.lastUpdatedSignal.set(value);
  }

  readonly detailedHtml = computed<SafeHtml | null>(() => {
    const detail = this.today()?.detailed;
    if (!detail) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustHtml(detail);
  });

  readonly stationMetrics = computed(() => {
    const station = this.selectedStation();
    if (!station) {
      return [];
    }
    return [
      {
        label: 'Temperature',
        icon: 'thermostat',
        value:
          typeof station.temperature === 'number'
            ? `${station.temperature.toFixed(1)}°C`
            : '--',
      },
      {
        label: 'Feels like',
        icon: 'device_thermostat',
        value:
          typeof station.feelTemperature === 'number'
            ? `${station.feelTemperature.toFixed(1)}°C`
            : '--',
      },
      {
        label: 'Wind',
        icon: 'air',
        value:
          typeof station.windSpeed === 'number'
            ? `${station.windSpeed.toFixed(1)} m/s ${
                station.windDirectionText
                  ? `(${station.windDirectionText})`
                  : ''
              }`
            : '--',
      },
      {
        label: 'Gusts',
        icon: 'flag',
        value:
          typeof station.windGusts === 'number'
            ? `${station.windGusts.toFixed(1)} m/s`
            : '--',
      },
      {
        label: 'Pressure',
        icon: 'speed',
        value:
          typeof station.airPressure === 'number'
            ? `${station.airPressure.toFixed(0)} hPa`
            : '--',
      },
      {
        label: 'Humidity',
        icon: 'water_drop',
        value:
          typeof station.humidity === 'number'
            ? `${station.humidity.toFixed(0)}%`
            : '--',
      },
      {
        label: 'Rain (last hr)',
        icon: 'grain',
        value:
          typeof station.rainLastHour === 'number'
            ? `${station.rainLastHour.toFixed(1)} mm`
            : '--',
      },
      {
        label: 'Visibility',
        icon: 'visibility',
        value:
          typeof station.visibility === 'number'
            ? `${Math.round(station.visibility / 1000)} km`
            : '--',
      },
    ];
  });
}

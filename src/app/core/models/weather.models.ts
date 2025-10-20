export interface StationMeasurement {
  id: string;
  name: string;
  region?: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
  weatherDescription?: string | null;
  icon?: string | null;
  temperature?: number | null;
  groundTemperature?: number | null;
  feelTemperature?: number | null;
  windSpeed?: number | null;
  windBeaufort?: number | null;
  windDirection?: number | null;
  windDirectionText?: string | null;
  windGusts?: number | null;
  humidity?: number | null;
  airPressure?: number | null;
  precipitation?: number | null;
  rainLastHour?: number | null;
  rainLast24Hours?: number | null;
  sunPower?: number | null;
  visibility?: number | null;
}

export interface TodayOverview {
  summary?: string | null;
  detailed?: string | null;
  author?: string | null;
  start?: string | null;
  published?: string | null;
  sunrise?: string | null;
  sunset?: string | null;
  averageTemperature?: number | null;
  minTemperature?: number | null;
  maxTemperature?: number | null;
  averageWindSpeed?: number | null;
  stationCount: number;
}

export interface ForecastDay {
  day: string;
  minTemperature?: number | null;
  maxTemperature?: number | null;
  windSpeed?: number | null;
  windDirection?: string | null;
  rainChance?: number | null;
  sunChance?: number | null;
  weatherDescription?: string | null;
  icon?: string | null;
}

export interface WeatherData {
  stations: StationMeasurement[];
  today: TodayOverview;
  forecast: ForecastDay[];
  generatedAt: string;
}

export type MeasurementLayer = 'temperature' | 'wind' | 'pressure';

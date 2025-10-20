import { createServer } from 'http';
import { createYoga, createPubSub, createSchema } from 'graphql-yoga';
import fetch from 'cross-fetch';
import { mean } from 'lodash';

const WEATHER_SOURCE = 'https://data.buienradar.nl/2.0/feed/json';

type StationMeasurement = {
  id: string;
  name: string;
  region?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  weatherDescription?: string;
  icon?: string;
  temperature?: number;
  groundTemperature?: number;
  feelTemperature?: number;
  windSpeed?: number;
  windBeaufort?: number;
  windDirection?: number;
  windDirectionText?: string;
  windGusts?: number;
  humidity?: number;
  airPressure?: number;
  precipitation?: number;
  rainLastHour?: number;
  rainLast24Hours?: number;
  sunPower?: number;
  visibility?: number;
};

type TodayOverview = {
  summary?: string;
  detailed?: string;
  author?: string;
  start?: string;
  published?: string;
  sunrise?: string;
  sunset?: string;
  averageTemperature?: number;
  minTemperature?: number;
  maxTemperature?: number;
  averageWindSpeed?: number;
  stationCount: number;
};

type ForecastDay = {
  day: string;
  minTemperature?: number;
  maxTemperature?: number;
  windSpeed?: number;
  windDirection?: string;
  rainChance?: number;
  sunChance?: number;
  weatherDescription?: string;
  icon?: string;
};

type WeatherSnapshot = {
  stations: StationMeasurement[];
  today: TodayOverview;
  forecast: ForecastDay[];
  generatedAt: string;
};

type WeatherEvents = {
  weatherUpdated: [WeatherSnapshot];
};

const pubSub = createPubSub<WeatherEvents>();

class WeatherService {
  private cache: WeatherSnapshot | null = null;
  private lastGeneratedAt: string | null = null;
  private readonly pollMs: number;

  constructor(pollMs = 60_000) {
    this.pollMs = pollMs;
  }

  start() {
    // fetch immediately and then poll
    this.refresh().catch((error) => {
      console.error('Failed to fetch weather data on startup', error);
    });
    setInterval(() => {
      this.refresh().catch((error) => {
        console.error('Failed to refresh weather data', error);
      });
    }, this.pollMs).unref();
  }

  async getSnapshot(): Promise<WeatherSnapshot> {
    if (!this.cache) {
      await this.refresh();
    }
    if (!this.cache) {
      throw new Error('Weather data is not available yet.');
    }
    return this.cache;
  }

  private async refresh() {
    const response = await fetch(WEATHER_SOURCE, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch weather data: ${response.status} ${response.statusText}`
      );
    }
    const raw = await response.json();

    const transformed = this.transform(raw);
    if (
      this.lastGeneratedAt &&
      transformed.generatedAt === this.lastGeneratedAt &&
      this.cache
    ) {
      return;
    }

    this.cache = transformed;
    this.lastGeneratedAt = transformed.generatedAt;
    pubSub.publish('weatherUpdated', transformed);
  }

  private transform(raw: any): WeatherSnapshot {
    const stationMeasurements: StationMeasurement[] =
      raw?.actual?.stationmeasurements
        ?.filter((station: any) => station && station.lat && station.lon)
        ?.slice(0, 40)
        ?.map((station: any) => ({
          id: String(station.stationid),
          name: station.stationname,
          region: station.regio,
          latitude: station.lat,
          longitude: station.lon,
          timestamp: station.timestamp,
          weatherDescription: station.weatherdescription,
          icon: station.fullIconUrl ?? station.iconurl,
          temperature: station.temperature,
          groundTemperature: station.groundtemperature,
          feelTemperature: station.feeltemperature,
          windSpeed: station.windspeed,
          windBeaufort: station.windspeedBft,
          windDirection: station.winddirectiondegrees,
          windDirectionText: station.winddirection,
          windGusts: station.windgusts,
          humidity: station.humidity,
          airPressure: station.airpressure,
          precipitation: station.precipitation,
          rainLastHour: station.rainFallLastHour,
          rainLast24Hours: station.rainFallLast24Hour,
          sunPower: station.sunpower,
          visibility: station.visibility,
        })) ?? [];

    const temperatures = stationMeasurements
      .map((station) => station.temperature)
      .filter((value): value is number => typeof value === 'number');
    const winds = stationMeasurements
      .map((station) => station.windSpeed)
      .filter((value): value is number => typeof value === 'number');

    const today: TodayOverview = {
      summary: raw?.forecast?.weatherreport?.summary,
      detailed: raw?.forecast?.weatherreport?.text,
      author: raw?.forecast?.weatherreport?.author,
      published: raw?.forecast?.weatherreport?.published,
      start: raw?.forecast?.shortterm?.startdate,
      sunrise: raw?.actual?.sunrise,
      sunset: raw?.actual?.sunset,
      averageTemperature: temperatures.length ? mean(temperatures) : undefined,
      minTemperature: temperatures.length
        ? Math.min(...temperatures)
        : undefined,
      maxTemperature: temperatures.length
        ? Math.max(...temperatures)
        : undefined,
      averageWindSpeed: winds.length ? mean(winds) : undefined,
      stationCount: stationMeasurements.length,
    };

    const forecast: ForecastDay[] =
      raw?.forecast?.fivedayforecast?.map((day: any) => ({
        day: day?.day,
        minTemperature:
          day?.mintemperatureMin ?? day?.mintemperatureMax ?? undefined,
        maxTemperature:
          day?.maxtemperatureMax ?? day?.maxtemperatureMin ?? undefined,
        windSpeed: day?.wind,
        windDirection: day?.windDirection,
        rainChance: day?.rainChance,
        sunChance: day?.sunChance,
        weatherDescription: day?.weatherdescription,
        icon: day?.fullIconUrl ?? day?.iconurl,
      })) ?? [];

    const generatedAt =
      stationMeasurements.reduce((latest, station) => {
        return !latest || station.timestamp > latest
          ? station.timestamp
          : latest;
      }, raw?.forecast?.weatherreport?.published) ?? new Date().toISOString();

    return {
      stations: stationMeasurements,
      today,
      forecast,
      generatedAt,
    };
  }
}

const service = new WeatherService(
  Number(process.env['WEATHER_POLL_MS'] ?? '60000')
);
service.start();

const typeDefs = /* GraphQL */ `
  type StationMeasurement {
    id: ID!
    name: String!
    region: String
    latitude: Float!
    longitude: Float!
    timestamp: String!
    weatherDescription: String
    icon: String
    temperature: Float
    groundTemperature: Float
    feelTemperature: Float
    windSpeed: Float
    windBeaufort: Int
    windDirection: Float
    windDirectionText: String
    windGusts: Float
    humidity: Float
    airPressure: Float
    precipitation: Float
    rainLastHour: Float
    rainLast24Hours: Float
    sunPower: Float
    visibility: Float
  }

  type TodayOverview {
    summary: String
    detailed: String
    author: String
    start: String
    published: String
    sunrise: String
    sunset: String
    averageTemperature: Float
    minTemperature: Float
    maxTemperature: Float
    averageWindSpeed: Float
    stationCount: Int!
  }

  type ForecastDay {
    day: String!
    minTemperature: Float
    maxTemperature: Float
    windSpeed: Float
    windDirection: String
    rainChance: Float
    sunChance: Float
    weatherDescription: String
    icon: String
  }

  type WeatherData {
    stations: [StationMeasurement!]!
    today: TodayOverview!
    forecast: [ForecastDay!]!
    generatedAt: String!
  }

  type Query {
    weather: WeatherData!
    stations: [StationMeasurement!]!
    today: TodayOverview!
    forecast(days: Int = 5): [ForecastDay!]!
  }

  type Subscription {
    weatherUpdated: WeatherData!
  }
`;

const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers: {
      Query: {
        weather: async () => service.getSnapshot(),
        stations: async () => (await service.getSnapshot()).stations,
        today: async () => (await service.getSnapshot()).today,
        forecast: async (_: unknown, args: { days?: number }) => {
          const snapshot = await service.getSnapshot();
          if (!args.days || args.days >= snapshot.forecast.length) {
            return snapshot.forecast;
          }
          return snapshot.forecast.slice(0, args.days);
        },
      },
      Subscription: {
        weatherUpdated: {
          subscribe: () => pubSub.subscribe('weatherUpdated'),
          resolve: (payload: WeatherSnapshot) => payload,
        },
      },
    },
  }),
  graphqlEndpoint: '/graphql',
  maskedErrors: false,
});

const port = Number(process.env['PORT'] ?? 4000);

createServer(yoga).listen(port, () => {
  console.log(
    `🚀 Weather GraphQL server ready at http://localhost:${port}${yoga.graphqlEndpoint}`
  );
});

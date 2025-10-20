import { Injectable } from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { Observable, filter, map, shareReplay } from 'rxjs';
import { WEATHER_QUERY } from '../graphql/weather.queries';
import { WeatherData } from '../models/weather.models';

interface WeatherQueryResponse {
  weather: WeatherData;
}

@Injectable({
  providedIn: 'root',
})
export class WeatherDataService {
  private readonly pollInterval = 60_000;
  private queryRef: QueryRef<WeatherQueryResponse> | null = null;

  constructor(private readonly apollo: Apollo) {}

  watchWeather(): Observable<WeatherData> {
    if (!this.queryRef) {
      this.queryRef = this.apollo.watchQuery<WeatherQueryResponse>({
        query: WEATHER_QUERY,
        pollInterval: this.pollInterval,
        notifyOnNetworkStatusChange: true,
      });
    }

    return this.queryRef.valueChanges.pipe(
      map((result) => result.data?.weather),
      filter((weather): weather is WeatherData => Boolean(weather)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  async refresh(): Promise<void> {
    if (!this.queryRef) {
      return;
    }
    await this.queryRef.refetch();
  }
}

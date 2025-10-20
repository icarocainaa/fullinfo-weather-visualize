import { gql } from 'apollo-angular';

export const WEATHER_QUERY = gql`
  query WeatherData {
    weather {
      generatedAt
      stations {
        id
        name
        region
        latitude
        longitude
        timestamp
        weatherDescription
        icon
        temperature
        groundTemperature
        feelTemperature
        windSpeed
        windBeaufort
        windDirection
        windDirectionText
        windGusts
        humidity
        airPressure
        precipitation
        rainLastHour
        rainLast24Hours
        sunPower
        visibility
      }
      today {
        summary
        detailed
        author
        start
        published
        sunrise
        sunset
        averageTemperature
        minTemperature
        maxTemperature
        averageWindSpeed
        stationCount
      }
      forecast {
        day
        minTemperature
        maxTemperature
        windSpeed
        windDirection
        rainChance
        sunChance
        weatherDescription
        icon
      }
    }
  }
`;

export const WEATHER_UPDATED_SUBSCRIPTION = gql`
  subscription WeatherUpdated {
    weatherUpdated {
      generatedAt
      stations {
        id
        name
        region
        latitude
        longitude
        timestamp
        weatherDescription
        icon
        temperature
        groundTemperature
        feelTemperature
        windSpeed
        windBeaufort
        windDirection
        windDirectionText
        windGusts
        humidity
        airPressure
        precipitation
        rainLastHour
        rainLast24Hours
        sunPower
        visibility
      }
      today {
        summary
        detailed
        author
        start
        published
        sunrise
        sunset
        averageTemperature
        minTemperature
        maxTemperature
        averageWindSpeed
        stationCount
      }
      forecast {
        day
        minTemperature
        maxTemperature
        windSpeed
        windDirection
        rainChance
        sunChance
        weatherDescription
        icon
      }
    }
  }
`;

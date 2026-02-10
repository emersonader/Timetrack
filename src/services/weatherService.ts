import * as Location from 'expo-location';
import { getDatabase } from '../db/database';
import { SessionWeather } from '../types';

// Open-Meteo WMO weather codes to condition strings
function wmoCodeToCondition(code: number): string {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if (code >= 45 && code <= 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95 && code <= 99) return 'storm';
  return 'clear';
}

/**
 * Fetch current weather for a location using Open-Meteo (free, no API key)
 */
async function fetchWeather(lat: number, lon: number): Promise<{
  temperature_f: number;
  condition: string;
  wind_speed_mph: number;
  humidity: number;
} | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const current = data?.current;
    if (!current) return null;

    return {
      temperature_f: Math.round(current.temperature_2m ?? 0),
      condition: wmoCodeToCondition(current.weather_code ?? 0),
      wind_speed_mph: Math.round(current.wind_speed_10m ?? 0),
      humidity: Math.round(current.relative_humidity_2m ?? 0),
    };
  } catch (error) {
    console.error('Weather fetch failed:', error);
    return null;
  }
}

/**
 * Log weather for a session at clock-in time.
 * Non-fatal — silently returns null if permissions or API fail.
 */
export async function logWeatherForSession(sessionId: number): Promise<SessionWeather | null> {
  try {
    // Check if we have location permission
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const weather = await fetchWeather(
      location.coords.latitude,
      location.coords.longitude
    );
    if (!weather) return null;

    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO session_weather (session_id, temperature_f, condition, wind_speed_mph, humidity)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, weather.temperature_f, weather.condition, weather.wind_speed_mph, weather.humidity]
    );

    return {
      id: 0,
      session_id: sessionId,
      ...weather,
      recorded_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to log weather:', error);
    return null;
  }
}

/**
 * Get weather for a specific session
 */
export async function getWeatherForSession(sessionId: number): Promise<SessionWeather | null> {
  const db = await getDatabase();
  return db.getFirstAsync<SessionWeather>(
    'SELECT * FROM session_weather WHERE session_id = ?',
    [sessionId]
  );
}

/**
 * Get weather icon name for a condition
 */
export function getWeatherIcon(condition: string): string {
  switch (condition) {
    case 'clear': return 'sunny-outline';
    case 'cloudy': return 'cloudy-outline';
    case 'rain': return 'rainy-outline';
    case 'snow': return 'snow-outline';
    case 'storm': return 'thunderstorm-outline';
    case 'fog': return 'cloud-outline';
    default: return 'partly-sunny-outline';
  }
}

/**
 * Get weather correlation with productivity (avg earnings per hour by condition)
 */
export async function getWeatherProductivity(): Promise<{
  condition: string;
  avgEarningsPerHour: number;
  sessionCount: number;
}[]> {
  const db = await getDatabase();
  return db.getAllAsync<{
    condition: string;
    avgEarningsPerHour: number;
    sessionCount: number;
  }>(
    `SELECT
       sw.condition,
       AVG(ts.duration * c.hourly_rate / 3600.0) / AVG(ts.duration / 3600.0) as avgEarningsPerHour,
       COUNT(ts.id) as sessionCount
     FROM session_weather sw
     JOIN time_sessions ts ON ts.id = sw.session_id AND ts.is_active = 0 AND ts.duration > 0
     JOIN clients c ON c.id = ts.client_id
     GROUP BY sw.condition
     HAVING sessionCount >= 2
     ORDER BY avgEarningsPerHour DESC`
  );
}

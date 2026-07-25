/**
 * Widgets.
 *
 * Only two, and both are true: the roles Jayden currently holds (static, in
 * the markup) and the live weather where he actually is. A widget rail padded
 * out with a music player he does not use would be set dressing.
 */

const BERKELEY = { lat: 37.8715, lon: -122.273 };

/** Open-Meteo WMO codes, collapsed to the distinctions a person cares about. */
const CONDITIONS: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

export async function initWeather(): Promise<void> {
  const temp = document.getElementById("wx-temp");
  const cond = document.getElementById("wx-cond");
  if (!temp || !cond) return;

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${BERKELEY.lat}&longitude=${BERKELEY.lon}` +
    "&current=temperature_2m,weather_code" +
    "&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles";

  try {
    // A widget is not worth hanging the page on. Give it four seconds.
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timer);
    if (!response.ok) throw new Error(String(response.status));

    const data = (await response.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };

    const t = data.current?.temperature_2m;
    const code = data.current?.weather_code;
    if (typeof t !== "number") throw new Error("no reading");

    temp.textContent = String(Math.round(t));
    cond.textContent =
      (typeof code === "number" ? CONDITIONS[code] : undefined) ?? "—";
  } catch {
    // Say the widget is offline rather than showing a fabricated temperature.
    temp.textContent = "—";
    cond.textContent = "Weather offline";
  }
}

type RouteDistanceInput = {
  originAddress: string;
  destinationAddress: string;
};

export type RouteDistanceResult = {
  distanceMeters: number;
  durationSeconds: number;
  provider: "mapbox";
};

export class RoutingProviderError extends Error {
  code:
    | "INVALID_ADDRESS"
    | "NO_ROUTE"
    | "PROVIDER_REQUEST_FAILED"
    | "PROVIDER_CONFIG_MISSING"
    | "PROVIDER_RESPONSE_INVALID";

  constructor(
    code:
      | "INVALID_ADDRESS"
      | "NO_ROUTE"
      | "PROVIDER_REQUEST_FAILED"
      | "PROVIDER_CONFIG_MISSING"
      | "PROVIDER_RESPONSE_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "RoutingProviderError";
    this.code = code;
  }
}

type MapboxGeocodeFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
};

type MapboxGeocodeResponse = {
  features?: MapboxGeocodeFeature[];
};

type MapboxDirectionsRoute = {
  distance?: number;
  duration?: number;
};

type MapboxDirectionsResponse = {
  routes?: MapboxDirectionsRoute[];
};

function getMapboxToken() {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new RoutingProviderError(
      "PROVIDER_CONFIG_MISSING",
      "Missing MAPBOX_ACCESS_TOKEN environment variable.",
    );
  }
  return token;
}

async function geocodeAddress(address: string, token: string) {
  const trimmed = address.trim();
  if (!trimmed) {
    throw new RoutingProviderError("INVALID_ADDRESS", "Missing job address.");
  }

  const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?limit=1&access_token=${encodeURIComponent(token)}`;

  const response = await fetch(geocodeUrl, { method: "GET" });
  if (!response.ok) {
    throw new RoutingProviderError(
      "PROVIDER_REQUEST_FAILED",
      `Mapbox geocoding failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as MapboxGeocodeResponse;
  const coordinates = payload.features?.[0]?.geometry?.coordinates;
  if (!coordinates || coordinates.length !== 2) {
    throw new RoutingProviderError(
      "INVALID_ADDRESS",
      "Invalid origin or destination address.",
    );
  }

  return {
    lon: coordinates[0],
    lat: coordinates[1],
  };
}

export async function getDrivingDistance(input: RouteDistanceInput): Promise<RouteDistanceResult> {
  const token = getMapboxToken();

  const [origin, destination] = await Promise.all([
    geocodeAddress(input.originAddress, token),
    geocodeAddress(input.destinationAddress, token),
  ]);

  const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=simplified&geometries=geojson&access_token=${encodeURIComponent(token)}`;

  const response = await fetch(directionsUrl, { method: "GET" });
  if (!response.ok) {
    throw new RoutingProviderError(
      "PROVIDER_REQUEST_FAILED",
      `Mapbox directions failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as MapboxDirectionsResponse;
  const route = payload.routes?.[0];

  if (!route) {
    throw new RoutingProviderError("NO_ROUTE", "No route found between the selected jobs.");
  }

  if (
    typeof route.distance !== "number" ||
    !Number.isFinite(route.distance) ||
    route.distance <= 0 ||
    typeof route.duration !== "number" ||
    !Number.isFinite(route.duration)
  ) {
    throw new RoutingProviderError(
      "PROVIDER_RESPONSE_INVALID",
      "Provider returned an invalid route response.",
    );
  }

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    provider: "mapbox",
  };
}

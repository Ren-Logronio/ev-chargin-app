export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
}

export interface LocationService {
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationCoordinates | null>;
  subscribe: (callback: (location: LocationCoordinates | null) => void) => () => void;
}

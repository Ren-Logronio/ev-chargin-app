import { createContext } from "react";
import type { LocationCoordinates, LocationService } from "@/modules/interfaces/location";

export interface LocationContext {
  location: LocationCoordinates | null;
  locationService: LocationService;
}

export const locationContext = createContext<LocationContext | null>(null);

export const LocationContextProvider = locationContext.Provider;

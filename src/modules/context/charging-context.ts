import { createContext } from "react";
import type { ChargingService, ChargingSession, ChargingSessionEvent } from "@/modules/interfaces/charging";

export interface ChargingContext {
  session: ChargingSession | null;
  sessionEvent: ChargingSessionEvent | null;
  chargingService: ChargingService;
}

export const chargingContext = createContext<ChargingContext | null>(null);

export const ChargingContextProvider = chargingContext.Provider;

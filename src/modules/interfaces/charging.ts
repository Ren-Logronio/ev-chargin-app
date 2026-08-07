export interface ChargingStation {
  id: string;
  title: string;
  kw: number;
  ratePerKwh: number;
}

export interface ChargingSession {
  id: string;
  stationId: string;
  stationTitle: string;
  unit: string;
  kw: number;
  ratePerKwh: number;
  dateStarted: Date;
}

export interface ChargingSessionEvent {
  progress: number; // 0.000-1.000
  status: "ready" | "charging" | "disconnected" | "cancelled" | "finished";
  kwhDelivered: number;
  estimatedDateTimeToFinish: Date | null;
  dateFinished: Date | null;
  dateCancelled: Date | null;
}

// The bill produced when a session ends - what gets debited from the account
// via AccountService.charge, i.e. the "top-up charge" for that session.
export interface ChargingCharge {
  sessionId: string;
  amountCents: number;
  currency: string;
  kwhDelivered: number;
  chargedAt: Date;
}

export interface ChargingService {
  getActiveSession: () => ChargingSession | null;
  startSession: (station: ChargingStation, unit: string) => Promise<ChargingSession>;
  stopSession: () => Promise<ChargingCharge>;
  subscribe: (callback: (event: ChargingSessionEvent) => void) => () => void;
}

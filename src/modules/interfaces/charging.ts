export interface ChargingSession {
  id: string;
  station: string;
  unit: string;
  subscribe: (event: ChargingSessionEvent) => () => {};
}

export interface ChargingSessionEvent {
  progress: number; // 0.000-1.000
  status: "ready" | "charging" | "disconnected" | "cancelled" | "finished";
  estimatedDateTimeToFinish: Date | null;
  dateFinished: Date | null;
  dateCancelled: Date | null;
}

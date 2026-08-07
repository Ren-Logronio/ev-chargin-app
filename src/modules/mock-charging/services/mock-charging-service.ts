import type { AccountService } from "@/modules/interfaces/account"
import type {
  ChargingCharge,
  ChargingService,
  ChargingSession,
  ChargingSessionEvent,
  ChargingStation,
} from "@/modules/interfaces/charging"

const TICK_MS = 400
const PROGRESS_PER_TICK = 0.02
const SESSION_KWH_CAPACITY = 62

export class MockChargingService implements ChargingService {
  #accountService: AccountService
  #session: ChargingSession | null = null
  #event: ChargingSessionEvent | null = null
  #listeners = new Set<(event: ChargingSessionEvent) => void>()
  #timer: ReturnType<typeof setInterval> | null = null

  constructor(accountService: AccountService) {
    this.#accountService = accountService
  }

  getActiveSession(): ChargingSession | null {
    return this.#session
  }

  async startSession(station: ChargingStation, unit: string): Promise<ChargingSession> {
    if (this.#session) {
      throw new Error("A charging session is already in progress.")
    }

    const session: ChargingSession = {
      id: `session-${Date.now()}`,
      stationId: station.id,
      stationTitle: station.title,
      unit,
      kw: station.kw,
      ratePerKwh: station.ratePerKwh,
      dateStarted: new Date(),
    }
    this.#session = session

    const totalTicks = 1 / PROGRESS_PER_TICK
    this.#setEvent({
      progress: 0,
      status: "charging",
      kwhDelivered: 0,
      estimatedDateTimeToFinish: new Date(Date.now() + totalTicks * TICK_MS),
      dateFinished: null,
      dateCancelled: null,
    })

    this.#timer = setInterval(() => this.#tick(), TICK_MS)

    return session
  }

  async stopSession(): Promise<ChargingCharge> {
    if (!this.#session || !this.#event) {
      throw new Error("No charging session is in progress.")
    }
    return this.#finishSession("cancelled")
  }

  subscribe(callback: (event: ChargingSessionEvent) => void): () => void {
    this.#listeners.add(callback)
    return () => this.#listeners.delete(callback)
  }

  #tick() {
    if (!this.#event) return
    const progress = Math.min(1, this.#event.progress + PROGRESS_PER_TICK)
    this.#setEvent({ ...this.#event, progress, kwhDelivered: progress * SESSION_KWH_CAPACITY })
    if (progress >= 1) {
      void this.#finishSession("finished")
    }
  }

  async #finishSession(status: "finished" | "cancelled"): Promise<ChargingCharge> {
    const session = this.#session
    const event = this.#event
    if (!session || !event) {
      throw new Error("No charging session is in progress.")
    }

    if (this.#timer) {
      clearInterval(this.#timer)
      this.#timer = null
    }

    const now = new Date()
    const amountCents = Math.round(event.kwhDelivered * session.ratePerKwh * 100)

    this.#setEvent({
      ...event,
      status,
      dateFinished: status === "finished" ? now : null,
      dateCancelled: status === "cancelled" ? now : null,
    })

    if (amountCents > 0) {
      await this.#accountService.charge(amountCents)
    }

    this.#session = null

    return {
      sessionId: session.id,
      amountCents,
      currency: "USD",
      kwhDelivered: event.kwhDelivered,
      chargedAt: now,
    }
  }

  #setEvent(event: ChargingSessionEvent) {
    this.#event = event
    for (const listener of this.#listeners) listener(event)
  }
}

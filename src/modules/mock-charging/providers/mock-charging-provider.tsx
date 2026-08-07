import { useEffect, useState } from "react"
import { ChargingContextProvider } from "@/modules/context/charging-context"
import type { ChargingService, ChargingSessionEvent } from "@/modules/interfaces/charging"

type MockChargingProviderProps = React.PropsWithChildren<{
  chargingService: ChargingService
}>

export function MockChargingProvider({ chargingService, children }: MockChargingProviderProps) {
  const [session, setSession] = useState(chargingService.getActiveSession())
  const [sessionEvent, setSessionEvent] = useState<ChargingSessionEvent | null>(null)

  useEffect(() => {
    const unsubscribe = chargingService.subscribe((event) => {
      setSessionEvent(event)
      setSession(chargingService.getActiveSession())
    })
    return unsubscribe
  }, [chargingService])

  return (
    <ChargingContextProvider value={{ session, sessionEvent, chargingService }}>
      {children}
    </ChargingContextProvider>
  )
}

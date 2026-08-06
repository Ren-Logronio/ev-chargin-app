import { useEffect, useState } from "react"
import { LocationContextProvider } from "@/modules/context/location-context"
import type { LocationCoordinates, LocationService } from "@/modules/interfaces/location"

type ExpoLocationProviderProps = React.PropsWithChildren<{
  locationService: LocationService
}>

export function ExpoLocationProvider({ locationService, children }: ExpoLocationProviderProps) {
  const [location, setLocation] = useState<LocationCoordinates | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    async function start() {
      await locationService.requestPermission()
      if (cancelled) return
      unsubscribe = locationService.subscribe(setLocation)
    }
    void start()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [locationService])

  return <LocationContextProvider value={{ location, locationService }}>
    {children}
  </LocationContextProvider>
}

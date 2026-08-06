import * as Location from "expo-location"
import type { LocationCoordinates, LocationService } from "@/modules/interfaces/location"

function toCoordinates(location: Location.LocationObject): LocationCoordinates {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    heading: location.coords.heading,
    accuracy: location.coords.accuracy,
  }
}

export class ExpoLocationService implements LocationService {
  #listeners = new Set<(location: LocationCoordinates | null) => void>()
  #subscription: Location.LocationSubscription | null = null
  #current: LocationCoordinates | null = null

  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync()
    return status === Location.PermissionStatus.GRANTED
  }

  async getCurrentLocation(): Promise<LocationCoordinates | null> {
    const { status } = await Location.getForegroundPermissionsAsync()
    if (status !== Location.PermissionStatus.GRANTED) return null

    const location = await Location.getCurrentPositionAsync({ accuracy: Location.LocationAccuracy.Balanced })
    this.#current = toCoordinates(location)
    return this.#current
  }

  subscribe(callback: (location: LocationCoordinates | null) => void): () => void {
    this.#listeners.add(callback)
    callback(this.#current)
    void this.#ensureWatching()

    return () => {
      this.#listeners.delete(callback)
      if (this.#listeners.size === 0) this.#stopWatching()
    }
  }

  async #ensureWatching() {
    if (this.#subscription) return
    const { status } = await Location.getForegroundPermissionsAsync()
    if (status !== Location.PermissionStatus.GRANTED) return

    this.#subscription = await Location.watchPositionAsync(
      { accuracy: Location.LocationAccuracy.Balanced, timeInterval: 2000, distanceInterval: 5 },
      (location) => {
        this.#current = toCoordinates(location)
        for (const listener of this.#listeners) listener(this.#current)
      }
    )
  }

  #stopWatching() {
    this.#subscription?.remove()
    this.#subscription = null
  }
}

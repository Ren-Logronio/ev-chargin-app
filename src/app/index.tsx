import { useContext, useEffect, useRef, useState } from 'react';
import { Image, useWindowDimensions, View } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE, type LatLng } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TopUpDialog } from '@/components/account/top-up-dialog';
import { CurrentLocationMarker } from '@/components/map/current-location-marker';
import { StationMarker } from '@/components/map/station-marker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getAuthErrorMessage } from '@/lib/firebase-auth-error';
import { DARK_MAP_STYLE } from '@/lib/map-style';
import { accountContext } from '@/modules/context/account-context';
import { authContext } from '@/modules/context/auth-context';
import { chargingContext } from '@/modules/context/charging-context';
import { locationContext } from '@/modules/context/location-context';
import type { AccountBalance } from '@/modules/interfaces/account';

const INITIAL_CAMERA = {
  center: { latitude: 6.1164, longitude: 125.1716 },
  pitch: 0,
  heading: 0,
  zoom: 14,
};

const COLLAPSED_VISIBLE_HEIGHT = 260;
const TILT_PITCH = 58;
const TILT_HEADING = 25;
// Tilting a camera while keeping the same center/target doesn't keep that point
// pinned to the same screen pixel — the SDK pulls the camera back and the target
// visually slides toward the bottom of the screen. The flat fit correctly clears
// the bottom sheet, then the tilt drags it right back down toward/under the sheet.
// This is extra clearance to counteract that shift; it's an approximation (the
// real shift scales with TILT_PITCH), tune it on a device if it's still off.
const TILT_SHIFT_COMPENSATION = 160;
// Forced zoom-in on top of whatever fitToCoordinates auto-picks, applied at the
// same time as the tilt (see below) — the more padding is needed to clear the
// bottom sheet, the further fitToCoordinates zooms out to still fit both points
// in the shrunken box, which reads as "not zoomed in on the thing."
const EXTRA_ZOOM = 1.4;
const ROUTE_COLOR = '#00e0a4';
const AVERAGE_DRIVING_SPEED_MPH = 22;
// Client-exposed on purpose: the same key already ships embedded in the native
// Android/iOS binaries for map rendering (see app.config.ts), so putting it in
// the JS bundle for road-snapped Directions calls adds no new exposure.
const DIRECTIONS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function distanceInMiles(from: LatLng, to: LatLng) {
  const EARTH_RADIUS_MILES = 3958.8;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MOCK_STATIONS = [
  { id: '1', title: 'KCC Mall Charge Hub', coordinate: { latitude: 6.1128, longitude: 125.175 }, kw: 150, price: 0.42 },
  { id: '2', title: 'Gaisano Mall Supercharger', coordinate: { latitude: 6.1136, longitude: 125.1706 }, kw: 50, price: 0.35 },
  { id: '3', title: 'Robinsons Place Fast Charge', coordinate: { latitude: 6.093, longitude: 125.1735 }, kw: 250, price: 0.48 },
];

type Station = (typeof MOCK_STATIONS)[number];

const CAR_STATS = {
  batteryPercent: 78,
  rangeMiles: 212,
  plugType: 'CCS',
};

const CAR_PHOTO_URL = 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&q=80';

function formatBalance(balance: AccountBalance) {
  return `$${(balance.amountCents / 100).toFixed(2)}`;
}

export default function Index() {
  const auth = useContext(authContext);
  const account = useContext(accountContext);
  const charging = useContext(chargingContext);
  const locationCtx = useContext(locationContext);
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  // fitToCoordinates/getCamera/animateCamera all silently no-op on the native
  // side until the underlying GoogleMap object exists (Android:
  // MapView.java's fitToCoordinates literally does `if (map == null) return;`).
  // "Find Charging" is often the very first tap after opening the app, right
  // while the native map SDK is still initializing — without this gate, the
  // fit effect below could fire and do nothing, leaving the camera wherever
  // initialCamera put it.
  const [mapReady, setMapReady] = useState(false);

  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'welcome' | 'stations'>('welcome');
  const [selectedStationId, setSelectedStationId] = useState(MOCK_STATIONS[0].id);
  const [roadRoute, setRoadRoute] = useState<{ coordinates: LatLng[]; miles: number; etaMinutes: number } | null>(null);
  // Real height of the rendered station card, measured via onLayout — the card's
  // content (stat tiles, safe-area padding) can grow taller than the old hardcoded
  // COLLAPSED_VISIBLE_HEIGHT, and overflow-hidden was silently clipping the button
  // whenever it did. Starts at the fallback constant so there's no flash on first paint.
  const [stationSheetHeight, setStationSheetHeight] = useState(COLLAPSED_VISIBLE_HEIGHT);

  const progress = useSharedValue(0);

  const selectedStation = MOCK_STATIONS.find((station) => station.id === selectedStationId) ?? MOCK_STATIONS[0];
  // Stripped to lat/lng only: locationCtx.location also carries heading/accuracy,
  // which jitter on every ~2s GPS tick. MapViewDirections deep-compares the whole
  // origin object to decide whether to refetch, so leaving those fields in caused
  // it to reset and refetch the road route constantly even while standing still.
  const originCoordinate: LatLng = locationCtx?.location
    ? { latitude: locationCtx.location.latitude, longitude: locationCtx.location.longitude }
    : INITIAL_CAMERA.center;

  // Straight-line fallback: used until the road-snapped Directions route for this
  // station loads (or if no client-side Google Maps key is configured at all).
  const straightLineMiles = distanceInMiles(originCoordinate, selectedStation.coordinate);
  const straightLineEtaMinutes = Math.max(1, Math.round((straightLineMiles / AVERAGE_DRIVING_SPEED_MPH) * 60));
  const routeMiles = roadRoute?.miles ?? straightLineMiles;
  const routeEtaMinutes = roadRoute?.etaMinutes ?? straightLineEtaMinutes;

  // Latest-value ref for the camera effect below: origin ticks every ~2s from
  // GPS and shouldn't retrigger the fit (see the effect for why), so it's read
  // from a ref instead of being a reactive dependency.
  const originRef = useRef(originCoordinate);
  originRef.current = originCoordinate;

  function selectStation(id: string) {
    // Clear synchronously in the same update as the id change, not in a separate
    // effect keyed on selectedStationId — that used to let the camera-fit effect
    // below fire once with the OLD station's stale route paired with the NEW
    // station's coordinate, then again once the route cleared, then a third time
    // once the new route loaded. Each of those was a full flatten-then-retilt
    // camera animation, which is what made every swipe look like the map was
    // re-rotating itself.
    setSelectedStationId(id);
    setRoadRoute(null);
  }

  async function handleLogout() {
    if (!auth) return;
    setError(null);
    try {
      await auth.authService.logout();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  function handleStartCharging(station: Station) {
    if (!charging) return;
    setError(null);
    charging.chargingService
      .startSession({ id: station.id, title: station.title, kw: station.kw, ratePerKwh: station.price }, 'A1')
      .then(() => router.push('/charge'))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not start charging.'));
  }

  function handleFindCharging() {
    setMode('stations');
    progress.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
  }

  function handleBackToWelcome() {
    setMode('welcome');
    selectStation(MOCK_STATIONS[0].id);
    progress.value = withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) });
  }

  const selectedStationIndex = MOCK_STATIONS.findIndex((station) => station.id === selectedStationId);

  function handleCycleStation(direction: 1 | -1) {
    const nextIndex = (selectedStationIndex + direction + MOCK_STATIONS.length) % MOCK_STATIONS.length;
    selectStation(MOCK_STATIONS[nextIndex].id);
  }

  // Keep the camera framing the current location and whichever station is
  // selected, then tilt it for the cinematic 3D look. fitToCoordinates always
  // resets pitch/heading to 0 (it computes a flat top-down bounding box), so the
  // tilt has to be re-applied as a second step on top of whatever center/zoom it
  // lands on, not baked in upfront.
  //
  // This intentionally fires on station/mode change AND on stationSheetHeight —
  // the latter isn't incidental noise here, it's the real height of the card
  // covering the bottom of the map, first available only after StationCard's
  // onLayout fires post-mount (before that, stationSheetHeight is just the
  // COLLAPSED_VISIBLE_HEIGHT placeholder). If the fit only ran off the
  // placeholder, the reserved padding wouldn't match the actual card, so the
  // "centered" fit would sit centered in a box that doesn't match what's
  // actually visible around the card. origin is still read from a ref since
  // that ticks every ~2s from GPS and shouldn't retrigger this.
  useEffect(() => {
    if (mode !== 'stations' || !mapReady) return;
    const points = [originRef.current, selectedStation.coordinate];
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: {
        top: 140,
        right: 60,
        // Padding reserved above the bottom sheet — must be the sheet's own
        // height, not screenHeight - sheetHeight (the space ABOVE it). That
        // inverted math was reserving ~2/3 of the screen as unusable, leaving
        // fitToCoordinates almost no room to actually place both points.
        bottom: stationSheetHeight + 40 + TILT_SHIFT_COMPENSATION,
        left: 60,
      },
      animated: false,
    });
    const tiltTimeout = setTimeout(async () => {
      const camera = await mapRef.current?.getCamera();
      if (!camera) return;
      // Applied instantly (duration: 0), not animated — animating this was the
      // visible "rotating into place" every time stations mode opened or the
      // station changed. It should just already be tilted, not seen tilting.
      // Zoom is bumped explicitly on top of whatever fitToCoordinates picked —
      // the padding needed to clear the bottom sheet (plus the tilt shift
      // compensation above) shrinks the box it fits into, which makes it zoom
      // out further to still fit both points in a smaller area. Rather than
      // fight that through padding, force it back in tighter here.
      mapRef.current?.animateCamera(
        { ...camera, pitch: TILT_PITCH, heading: TILT_HEADING, zoom: (camera.zoom ?? INITIAL_CAMERA.zoom) + EXTRA_ZOOM },
        { duration: 0 }
      );
    }, 60);
    return () => clearTimeout(tiltTimeout);
  }, [mode, mapReady, selectedStation.coordinate, screenHeight, stationSheetHeight]);

  const cardContainerStyle = useAnimatedStyle(() => {
    const top = interpolate(progress.value, [0, 1], [0, Math.max(screenHeight - stationSheetHeight, 0)], Extrapolation.CLAMP);
    const borderRadius = interpolate(progress.value, [0, 1], [0, 28], Extrapolation.CLAMP);
    return {
      top,
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
    };
  });

  return (
    <View className="flex-1 bg-background">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialCamera={INITIAL_CAMERA}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        scrollEnabled={false}
        rotateEnabled={false}
        zoomEnabled={false}
        zoomTapEnabled={false}
        zoomControlEnabled={false}
        onMapReady={() => setMapReady(true)}
      >
        {mode === 'stations' && DIRECTIONS_API_KEY ? (
          <MapViewDirections
            origin={originCoordinate}
            destination={selectedStation.coordinate}
            apikey={DIRECTIONS_API_KEY}
            mode="DRIVING"
            precision="high"
            region="ph"
            strokeColor={ROUTE_COLOR}
            strokeWidth={4}
            onReady={(result) =>
              setRoadRoute({
                coordinates: result.coordinates,
                miles: result.distance / 1.609344,
                etaMinutes: Math.max(1, Math.round(result.duration)),
              })
            }
            onError={(errorMessage) => {
              // Surface the real Directions API failure (e.g. REQUEST_DENIED because
              // the key isn't enabled for the Directions API, or has Android/iOS app
              // restrictions that a plain REST fetch can't satisfy) instead of failing
              // silently — falls back to the straight-line Polyline either way.
              console.warn('[MapViewDirections] road-snapped route failed:', errorMessage);
              setRoadRoute(null);
            }}
          />
        ) : null}
        {/* Straight-line fallback: visible while the road-snapped route is loading,
            and stays up permanently if it fails or no client key is configured. */}
        {mode === 'stations' && !roadRoute ? (
          <Polyline
            coordinates={[originCoordinate, selectedStation.coordinate]}
            strokeColor={ROUTE_COLOR}
            strokeWidth={4}
            lineDashPattern={[1, 10]}
            lineCap="round"
            zIndex={5}
          />
        ) : null}
        {locationCtx?.location ? (
          <CurrentLocationMarker coordinate={locationCtx.location} heading={locationCtx.location.heading} />
        ) : null}
        {MOCK_STATIONS.map((station) => (
          <StationMarker
            key={station.id}
            coordinate={station.coordinate}
            title={station.title}
            description={`${station.kw} kW · $${station.price.toFixed(2)}/kWh`}
            selected={station.id === selectedStationId}
            onPress={() => selectStation(station.id)}
          />
        ))}
      </MapView>

      <View className="absolute inset-x-4 flex-row items-center justify-between" style={{ top: insets.top + 12 }}>
        {mode === 'stations' ? (
          <Button variant="outline" size="icon" onPress={handleBackToWelcome}>
            <Icon as={ArrowLeft} size={18} />
          </Button>
        ) : (
          <Badge variant="secondary">
            <Text>{MOCK_STATIONS.length} chargers nearby</Text>
          </Badge>
        )}
        <View className="flex-row items-center gap-2">
          <TopUpDialog
            trigger={
              <Button variant="outline" size="sm">
                <Text>{account ? formatBalance(account.balance) : '—'}</Text>
              </Button>
            }
          />
          <Button variant="outline" size="sm" onPress={handleLogout}>
            <Text>Log out</Text>
          </Button>
        </View>
      </View>

      {error ? (
        <View className="absolute inset-x-4" style={{ top: insets.top + 56 }}>
          <Text variant="small" className="text-destructive">
            {error}
          </Text>
        </View>
      ) : null}

      <Animated.View className="absolute inset-x-0 bottom-0 overflow-hidden bg-background" style={cardContainerStyle}>
        {mode === 'welcome' ? (
          <WelcomeCard
            displayName={auth?.user?.displayName ?? null}
            onFindCharging={handleFindCharging}
            topInset={insets.top}
            bottomInset={insets.bottom}
          />
        ) : (
          <View onLayout={(event) => setStationSheetHeight(event.nativeEvent.layout.height)}>
            <StationCard
              station={selectedStation}
              stationIndex={selectedStationIndex}
              stationCount={MOCK_STATIONS.length}
              distanceMiles={routeMiles}
              etaMinutes={routeEtaMinutes}
              onStartCharging={() => handleStartCharging(selectedStation)}
              onNextStation={() => handleCycleStation(1)}
              onPrevStation={() => handleCycleStation(-1)}
              bottomInset={insets.bottom}
            />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function WelcomeCard({
  displayName,
  onFindCharging,
  topInset,
  bottomInset,
}: {
  displayName: string | null;
  onFindCharging: () => void;
  topInset: number;
  bottomInset: number;
}) {
  const firstName = displayName?.split(' ')[0] ?? 'there';

  return (
    <View className="flex-1 px-6" style={{ paddingTop: topInset + 24, paddingBottom: bottomInset + 16 }}>
      <Text variant="muted">Welcome back</Text>
      <Text variant="h1" className="pb-0 text-left">
        {firstName} 👋
      </Text>

      <View className="mt-6 overflow-hidden rounded-2xl border border-border">
        <Image source={{ uri: CAR_PHOTO_URL }} className="h-48 w-full" resizeMode="cover" />
      </View>

      <View className="mt-6 flex-row gap-3">
        <StatTile label="Battery" value={`${CAR_STATS.batteryPercent}%`} />
        <StatTile label="Range" value={`${CAR_STATS.rangeMiles} mi`} />
        <StatTile label="Plug" value={CAR_STATS.plugType} />
      </View>

      <Button className="mt-auto" size="lg" onPress={onFindCharging}>
        <Text>Find Charging</Text>
      </Button>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-xl bg-muted py-3">
      <Text variant="large">{value}</Text>
      <Text variant="muted" className="text-xs">
        {label}
      </Text>
    </View>
  );
}

// Swipe past this many px before the release is treated as a station change
// rather than a tap/wiggle that should just spring back to center.
const STATION_SWIPE_THRESHOLD = 72;
// The old/new card content swap happens off-screen (see StationCard below), so
// these only govern how fast the card slides out and back in — not when the
// underlying station actually changes.
const CARD_SWIPE_EXIT_MS = 200;
const CARD_SWIPE_ENTER_MS = 280;

function StationCard({
  station,
  stationIndex,
  stationCount,
  distanceMiles,
  etaMinutes,
  onStartCharging,
  onNextStation,
  onPrevStation,
  bottomInset,
}: {
  station: Station;
  stationIndex: number;
  stationCount: number;
  distanceMiles: number;
  etaMinutes: number;
  onStartCharging: () => void;
  onNextStation: () => void;
  onPrevStation: () => void;
  bottomInset: number;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);

  // Slides the current card fully off-screen, THEN swaps to the new station
  // (via onNextStation/onPrevStation) once it's off-screen and invisible, then
  // slides the (now updated) card back in from the opposite edge. Content only
  // ever changes while off-screen, so it reads as one card sliding out and a
  // different one sliding in — not the same card popping to new content in place.
  function goToStation(direction: 1 | -1) {
    const exitTo = direction === 1 ? -screenWidth : screenWidth;
    const enterFrom = direction === 1 ? screenWidth : -screenWidth;
    translateX.value = withTiming(exitTo, { duration: CARD_SWIPE_EXIT_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) {
        translateX.value = enterFrom;
        scheduleOnRN(direction === 1 ? onNextStation : onPrevStation);
      }
    });
  }

  // Once the station prop actually changes (card is sitting off-screen at
  // enterFrom from goToStation above), slide it back in to center.
  useEffect(() => {
    translateX.value = withTiming(0, { duration: CARD_SWIPE_ENTER_MS, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station.id]);

  // Require a mostly-horizontal drag before the pan activates, so a vertical
  // wiggle or a tap on "Start Charging" doesn't get swallowed by the gesture.
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onChange((event) => {
      translateX.value += event.changeX;
    })
    .onEnd(() => {
      if (translateX.value <= -STATION_SWIPE_THRESHOLD) {
        translateX.value = withTiming(-screenWidth, { duration: CARD_SWIPE_EXIT_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) {
            translateX.value = screenWidth;
            scheduleOnRN(onNextStation);
          }
        });
      } else if (translateX.value >= STATION_SWIPE_THRESHOLD) {
        translateX.value = withTiming(screenWidth, { duration: CARD_SWIPE_EXIT_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) {
            translateX.value = -screenWidth;
            scheduleOnRN(onPrevStation);
          }
        });
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={cardStyle}>
        <Card className="m-4" style={{ marginBottom: bottomInset + 16 }}>
          <CardHeader>
            <View className="flex-row items-center justify-between">
              <CardTitle>{station.title}</CardTitle>
              <Badge>
                <Text>{station.kw} kW</Text>
              </Badge>
            </View>
            <CardDescription>${station.price.toFixed(2)}/kWh</CardDescription>
            <View className="mt-1 flex-row items-center justify-between">
              <Button variant="ghost" size="icon" onPress={() => goToStation(-1)}>
                <Icon as={ChevronLeft} size={20} />
              </Button>
              <Text variant="muted" className="text-xs">
                Station {stationIndex + 1} of {stationCount}
              </Text>
              <Button variant="ghost" size="icon" onPress={() => goToStation(1)}>
                <Icon as={ChevronRight} size={20} />
              </Button>
            </View>
          </CardHeader>
          <CardContent>
            <View className="flex-row gap-3">
              <View className="flex-1 items-center gap-1 rounded-xl bg-muted py-3">
                <Text variant="large">{distanceMiles.toFixed(1)} mi</Text>
                <Text variant="muted" className="text-xs">
                  Distance
                </Text>
              </View>
              <View className="flex-1 items-center gap-1 rounded-xl bg-muted py-3">
                <Text variant="large">{etaMinutes} min</Text>
                <Text variant="muted" className="text-xs">
                  Est. arrival
                </Text>
              </View>
            </View>
            <Text variant="muted" className="mt-3">
              Available now · 4 of 6 stalls open
            </Text>
          </CardContent>
          <CardFooter>
            <Button className="flex-1" onPress={onStartCharging}>
              <Text>Start Charging</Text>
            </Button>
          </CardFooter>
        </Card>
      </Animated.View>
    </GestureDetector>
  );
}

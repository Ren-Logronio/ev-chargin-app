import { useContext, useRef, useState } from 'react';
import { Image, useWindowDimensions, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { TopUpDialog } from '@/components/account/top-up-dialog';
import { CurrentLocationMarker } from '@/components/map/current-location-marker';
import { StationMarker } from '@/components/map/station-marker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { getAuthErrorMessage } from '@/lib/firebase-auth-error';
import { DARK_MAP_STYLE } from '@/lib/map-style';
import { accountContext } from '@/modules/context/account-context';
import { authContext } from '@/modules/context/auth-context';
import { locationContext } from '@/modules/context/location-context';
import type { AccountBalance } from '@/modules/interfaces/account';

const INITIAL_CAMERA = {
  center: { latitude: 6.1164, longitude: 125.1716 },
  pitch: 0,
  heading: 0,
  zoom: 14,
};

const TILT_PITCH = 58;
const TILT_HEADING = 25;
const TILT_ZOOM = 17;

const COLLAPSED_VISIBLE_HEIGHT = 260;

const MOCK_STATIONS = [
  { id: '1', title: 'KCC Mall Charge Hub', coordinate: { latitude: 6.1128, longitude: 125.175 }, kw: 150, price: 0.42, distanceMiles: 0.3 },
  { id: '2', title: 'Gaisano Mall Supercharger', coordinate: { latitude: 6.1136, longitude: 125.1706 }, kw: 50, price: 0.35, distanceMiles: 0.6 },
  { id: '3', title: 'Robinsons Place Fast Charge', coordinate: { latitude: 6.093, longitude: 125.1735 }, kw: 250, price: 0.48, distanceMiles: 0.9 },
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
  const locationCtx = useContext(locationContext);
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);

  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'welcome' | 'stations'>('welcome');
  const [selectedStationId, setSelectedStationId] = useState(MOCK_STATIONS[0].id);

  const progress = useSharedValue(0);

  const selectedStation = MOCK_STATIONS.find((station) => station.id === selectedStationId) ?? MOCK_STATIONS[0];

  async function handleLogout() {
    if (!auth) return;
    setError(null);
    try {
      await auth.authService.logout();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  function handleFindCharging() {
    setMode('stations');
    progress.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });

    const target = locationCtx?.location ?? INITIAL_CAMERA.center;
    mapRef.current?.animateCamera(
      {
        center: { latitude: target.latitude, longitude: target.longitude },
        pitch: TILT_PITCH,
        heading: TILT_HEADING,
        zoom: TILT_ZOOM,
      },
      { duration: 900 }
    );
  }

  const cardContainerStyle = useAnimatedStyle(() => {
    const top = interpolate(progress.value, [0, 1], [0, Math.max(screenHeight - COLLAPSED_VISIBLE_HEIGHT, 0)], Extrapolation.CLAMP);
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
      >
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
            onPress={() => setSelectedStationId(station.id)}
          />
        ))}
      </MapView>

      <View className="absolute inset-x-4 top-16 flex-row items-center justify-between">
        <Badge variant="secondary">
          <Text>{MOCK_STATIONS.length} chargers nearby</Text>
        </Badge>
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
        <View className="absolute inset-x-4 top-28">
          <Text variant="small" className="text-destructive">
            {error}
          </Text>
        </View>
      ) : null}

      <Animated.View className="absolute inset-x-0 bottom-0 overflow-hidden bg-background" style={cardContainerStyle}>
        {mode === 'welcome' ? (
          <WelcomeCard displayName={auth?.user?.displayName ?? null} onFindCharging={handleFindCharging} />
        ) : (
          <StationCard station={selectedStation} onStartCharging={() => router.push('/charge')} />
        )}
      </Animated.View>

      <StatusBar style="light" />
    </View>
  );
}

function WelcomeCard({ displayName, onFindCharging }: { displayName: string | null; onFindCharging: () => void }) {
  const firstName = displayName?.split(' ')[0] ?? 'there';

  return (
    <View className="flex-1 px-6 pb-8 pt-20">
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

function StationCard({ station, onStartCharging }: { station: Station; onStartCharging: () => void }) {
  return (
    <Card className="m-4 mb-6">
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <CardTitle>{station.title}</CardTitle>
          <Badge>
            <Text>{station.kw} kW</Text>
          </Badge>
        </View>
        <CardDescription>
          {station.distanceMiles} mi away · ${station.price.toFixed(2)}/kWh
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Text variant="muted">Available now · 4 of 6 stalls open</Text>
      </CardContent>
      <CardFooter>
        <Button className="flex-1" onPress={onStartCharging}>
          <Text>Start Charging</Text>
        </Button>
      </CardFooter>
    </Card>
  );
}

import { useContext, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { getAuthErrorMessage } from '@/lib/firebase-auth-error';
import { authContext } from '@/modules/context/auth-context';

const INITIAL_REGION = {
  latitude: 6.1164,
  longitude: 125.1716,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const MOCK_STATIONS = [
  { id: '1', title: 'KCC Mall Charge Hub', coordinate: { latitude: 6.1128, longitude: 125.175 }, kw: 150, price: 0.42, distanceMiles: 0.3 },
  { id: '2', title: 'Gaisano Mall Supercharger', coordinate: { latitude: 6.1136, longitude: 125.1706 }, kw: 50, price: 0.35, distanceMiles: 0.6 },
  { id: '3', title: 'Robinsons Place Fast Charge', coordinate: { latitude: 6.093, longitude: 125.1735 }, kw: 250, price: 0.48, distanceMiles: 0.9 },
];

export default function Index() {
  const auth = useContext(authContext);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState(MOCK_STATIONS[0].id);

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

  return (
    <View className="flex-1 bg-background">
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {MOCK_STATIONS.map((station) => (
          <Marker
            key={station.id}
            coordinate={station.coordinate}
            title={station.title}
            description={`${station.kw} kW · $${station.price.toFixed(2)}/kWh`}
            pinColor={station.id === selectedStationId ? '#007A55' : '#8B8B7A'}
            onPress={() => setSelectedStationId(station.id)}
          />
        ))}
      </MapView>

      <View className="absolute inset-x-4 top-16 flex-row items-center justify-between">
        <Badge variant="secondary">
          <Text>{MOCK_STATIONS.length} chargers nearby</Text>
        </Badge>
        <Button variant="outline" size="sm" onPress={handleLogout}>
          <Text>Log out</Text>
        </Button>
      </View>

      {error ? (
        <View className="absolute inset-x-4 top-28">
          <Text variant="small" className="text-destructive">
            {error}
          </Text>
        </View>
      ) : null}

      <View className="absolute inset-x-4 bottom-8">
        <Card>
          <CardHeader>
            <View className="flex-row items-center justify-between">
              <CardTitle>{selectedStation.title}</CardTitle>
              <Badge>
                <Text>{selectedStation.kw} kW</Text>
              </Badge>
            </View>
            <CardDescription>
              {selectedStation.distanceMiles} mi away · ${selectedStation.price.toFixed(2)}/kWh
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Text variant="muted">Available now · 4 of 6 stalls open</Text>
          </CardContent>
          <CardFooter>
            <Button className="flex-1" onPress={() => router.push('/charge')}>
              <Text>Start Charging</Text>
            </Button>
          </CardFooter>
        </Card>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

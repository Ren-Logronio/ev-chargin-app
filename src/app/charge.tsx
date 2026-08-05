import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BlurMask, Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { Easing, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

const RING_SIZE = 260;
const STROKE_WIDTH = 22;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CENTER = RING_SIZE / 2;

const TRACK_COLOR = 'rgba(255, 255, 255, 0.08)';
const RING_BACKDROP_COLOR = '#1d1d16';
const GLOW_COLOR = '#00f5b5';
const PROGRESS_COLOR = '#00e0a4';
const PROGRESS_COLOR_FULL = '#39ffc4';

const STATION = {
  title: 'Market St Supercharger',
  kw: 150,
  ratePerKwh: 0.42,
};

export default function Charge() {
  const router = useRouter();
  const [percent, setPercent] = useState(42);

  const glowBlur = useSharedValue(14);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    const interval = setInterval(() => {
      setPercent((prev) => (prev >= 100 ? 100 : prev + 1));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    glowBlur.value = withRepeat(
      withTiming(26, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withTiming(0.95, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [glowBlur, glowOpacity]);

  const sweepAngle = (percent / 100) * 360;
  const trackPath = Skia.Path.Make();
  trackPath.addCircle(CENTER, CENTER, RADIUS);

  const progressPath = Skia.Path.Make();
  progressPath.addArc(
    { x: STROKE_WIDTH / 2, y: STROKE_WIDTH / 2, width: RING_SIZE - STROKE_WIDTH, height: RING_SIZE - STROKE_WIDTH },
    -90,
    sweepAngle
  );

  const isFull = percent >= 100;
  const minutesRemaining = Math.max(0, Math.round(((100 - percent) / 100) * 38));
  const kwhDelivered = ((percent / 100) * 62).toFixed(1);
  const cost = (Number(kwhDelivered) * STATION.ratePerKwh).toFixed(2);

  return (
    <View className="flex-1 bg-background p-6 pt-16">
      <Text variant="muted">{STATION.title}</Text>
      <Text variant="h2" className="border-0 pb-0">
        Charging Session
      </Text>

      <View className="mt-8 items-center">
        <Canvas style={{ width: RING_SIZE, height: RING_SIZE }}>
          <Group>
            <Path path={trackPath} style="stroke" strokeWidth={STROKE_WIDTH} color={TRACK_COLOR} />
            {/* Soft pulsing glow rendered behind the crisp progress arc */}
            <Path
              path={progressPath}
              style="stroke"
              strokeWidth={STROKE_WIDTH + 12}
              strokeCap="round"
              color={GLOW_COLOR}
              opacity={glowOpacity}
            >
              <BlurMask blur={glowBlur} style="normal" />
            </Path>
            <Path
              path={progressPath}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="round"
              color={isFull ? PROGRESS_COLOR_FULL : PROGRESS_COLOR}
            />
            <Circle cx={CENTER} cy={CENTER} r={RADIUS - STROKE_WIDTH} color={RING_BACKDROP_COLOR} />
          </Group>
        </Canvas>

        <View className="absolute items-center" style={{ top: CENTER - 28, width: RING_SIZE }}>
          <Text variant="h1" className="pb-0 text-5xl">
            {percent}%
          </Text>
          <Badge variant={isFull ? 'default' : 'secondary'}>
            <Text>{isFull ? 'Fully charged' : 'Charging'}</Text>
          </Badge>
        </View>
      </View>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Session details</CardTitle>
          <CardDescription>{STATION.kw} kW · ${STATION.ratePerKwh.toFixed(2)}/kWh</CardDescription>
        </CardHeader>
        <CardContent>
          <View className="flex-row justify-between py-1">
            <Text variant="muted">Energy delivered</Text>
            <Text>{kwhDelivered} kWh</Text>
          </View>
          <View className="flex-row justify-between py-1">
            <Text variant="muted">Time remaining</Text>
            <Text>{isFull ? 'Done' : `${minutesRemaining} min`}</Text>
          </View>
          <View className="flex-row justify-between py-1">
            <Text variant="muted">Estimated cost</Text>
            <Text>${cost}</Text>
          </View>
        </CardContent>
      </Card>

      <View className="mt-auto pb-4">
        <Button variant="outline" onPress={() => router.back()}>
          <Text>{isFull ? 'Done' : 'Stop Charging'}</Text>
        </Button>
      </View>
    </View>
  );
}

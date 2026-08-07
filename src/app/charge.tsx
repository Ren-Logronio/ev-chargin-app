import { useContext, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { BlurMask, Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CheckCircle2 } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { chargingContext } from '@/modules/context/charging-context';

const RING_SIZE = 260;
const STROKE_WIDTH = 22;
// Extra canvas bleed so the blurred glow (stroke + BlurMask spread) isn't clipped at the canvas edge.
const CANVAS_PADDING = 60;
const CANVAS_SIZE = RING_SIZE + CANVAS_PADDING * 2;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CENTER = CANVAS_SIZE / 2;

const TRACK_COLOR = 'rgba(255, 255, 255, 0.08)';
const RING_BACKDROP_COLOR = '#1d1d16';
const GLOW_COLOR = '#00f5b5';
const PROGRESS_COLOR = '#00e0a4';
const PROGRESS_COLOR_FULL = '#39ffc4';

export default function Charge() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const charging = useContext(chargingContext);
  const session = charging?.session ?? null;
  const event = charging?.sessionEvent ?? null;

  const percent = Math.round((event?.progress ?? 0) * 100);
  const isFull = event?.status === 'finished';

  const glowBlur = useSharedValue(14);
  const glowOpacity = useSharedValue(0.5);
  const sweepAngle = useSharedValue((percent / 100) * 360);
  const ringScale = useSharedValue(1);
  const checkmarkScale = useSharedValue(0);
  const wasFull = useRef(false);

  useEffect(() => {
    sweepAngle.value = withTiming((percent / 100) * 360, { duration: 400, easing: Easing.linear });
  }, [percent, sweepAngle]);

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

  // One-shot celebration the moment charging flips from in-progress to finished.
  useEffect(() => {
    if (isFull && !wasFull.current) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      ringScale.value = withSequence(
        withTiming(1.08, { duration: 220, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 7, stiffness: 140 })
      );
      checkmarkScale.value = withSequence(
        withTiming(0, { duration: 150 }),
        withSpring(1, { damping: 8, stiffness: 160 })
      );
    }
    wasFull.current = isFull;
  }, [isFull, ringScale, checkmarkScale]);

  const ringContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkScale.value,
  }));

  const trackPath = Skia.Path.Make();
  trackPath.addCircle(CENTER, CENTER, RADIUS);

  const progressPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    path.addArc(
      { x: CENTER - RADIUS, y: CENTER - RADIUS, width: RADIUS * 2, height: RADIUS * 2 },
      -90,
      sweepAngle.value
    );
    return path;
  });

  const minutesRemaining = event?.estimatedDateTimeToFinish
    ? Math.max(0, Math.round((event.estimatedDateTimeToFinish.getTime() - Date.now()) / 60000))
    : 0;
  const kwhDelivered = (event?.kwhDelivered ?? 0).toFixed(1);
  const ratePerKwh = session?.ratePerKwh ?? 0;
  const cost = (Number(kwhDelivered) * ratePerKwh).toFixed(2);

  async function handleStopOrDone() {
    if (charging && session && !isFull) {
      try {
        await charging.chargingService.stopSession();
      } catch {
        // session already ended server-side; fall through to navigate back
      }
    }
    router.back();
  }

  return (
    <View className="flex-1 bg-background p-6" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}>
      <Text variant="muted">{session?.stationTitle ?? 'Charging station'}</Text>
      <Text variant="h2" className="border-0 pb-0">
        Charging Session
      </Text>

      <Animated.View className="mt-8 items-center" style={ringContainerStyle}>
        <Canvas style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
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

        <View className="absolute items-center" style={{ top: CENTER - 28, width: CANVAS_SIZE }}>
          {isFull ? (
            <Animated.View style={checkmarkStyle}>
              <Icon as={CheckCircle2} size={44} className="text-primary" />
            </Animated.View>
          ) : (
            <Text variant="h1" className="pb-0 text-5xl">
              {percent}%
            </Text>
          )}
          <Badge variant={isFull ? 'default' : 'secondary'} className="mt-2">
            <Text>{isFull ? 'Fully charged' : 'Charging'}</Text>
          </Badge>
        </View>
      </Animated.View>

      {isFull ? (
        <Animated.View entering={FadeInDown.springify().damping(16).mass(0.6)} className="mt-6 flex-row items-center justify-center gap-2">
          <Icon as={CheckCircle2} size={18} className="text-primary" />
          <Text variant="muted">Charging complete — ready to unplug</Text>
        </Animated.View>
      ) : null}

      <Card className={isFull ? 'mt-6' : 'mt-8'}>
        <CardHeader>
          <CardTitle>Session details</CardTitle>
          <CardDescription>{session?.kw ?? 0} kW · ${ratePerKwh.toFixed(2)}/kWh</CardDescription>
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
        {isFull ? (
          <Animated.View entering={FadeInUp.springify().damping(14).mass(0.6)}>
            <Button size="lg" onPress={() => void handleStopOrDone()}>
              <Icon as={CheckCircle2} size={18} className="text-primary-foreground" />
              <Text>Done Charging</Text>
            </Button>
          </Animated.View>
        ) : (
          <Button variant="outline" onPress={() => void handleStopOrDone()}>
            <Text>Stop Charging</Text>
          </Button>
        )}
      </View>
    </View>
  );
}

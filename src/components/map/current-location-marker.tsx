import { useEffect } from 'react';
import { View } from 'react-native';
import { Marker, type LatLng } from 'react-native-maps';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const MARKER_SIZE = 56;
const ARROW_OFFSET = 18;

interface CurrentLocationMarkerProps {
  coordinate: LatLng;
  heading?: number | null;
}

export function CurrentLocationMarker({ coordinate, heading }: CurrentLocationMarkerProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.45 - pulse.value * 0.3,
    transform: [{ scale: 1 + pulse.value * 0.7 }],
  }));

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} flat zIndex={999}>
      <View className="items-center justify-center" style={{ width: MARKER_SIZE, height: MARKER_SIZE }}>
        <Animated.View className="absolute h-9 w-9 rounded-full bg-primary/40" style={haloStyle} />
        {heading != null ? (
          <View
            className="absolute items-center"
            style={{ transform: [{ rotate: `${heading}deg` }, { translateY: -ARROW_OFFSET }] }}
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 5,
                borderRightWidth: 5,
                borderBottomWidth: 8,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: 'hsl(163.0 100.0% 45%)',
              }}
            />
          </View>
        ) : null}
        <View className="h-5 w-5 rounded-full border-2 border-background bg-primary shadow-md shadow-black/40" />
      </View>
    </Marker>
  );
}

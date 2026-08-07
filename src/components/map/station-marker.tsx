import { useEffect } from 'react';
import { View } from 'react-native';
import { Marker, type LatLng } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const PIN_WIDTH = 34;
const PIN_HEIGHT = 44;
const SELECTED_COLOR = '#00e0a4';
const IDLE_COLOR = '#39392c';
const SELECTED_DOT_COLOR = '#04140f';
const IDLE_DOT_COLOR = '#bcbc9f';

// Classic teardrop pin silhouette, smooth curves (no hard corners), 24x24 viewBox.
const PIN_PATH = 'M12 2C7.86 2 4.5 5.36 4.5 9.5c0 6.2 7.5 12.5 7.5 12.5s7.5-6.3 7.5-12.5C19.5 5.36 16.14 2 12 2z';

interface StationMarkerProps {
  coordinate: LatLng;
  title: string;
  description?: string;
  selected?: boolean;
  onPress?: () => void;
}

export function StationMarker({ coordinate, title, description, selected, onPress }: StationMarkerProps) {
  const scale = useSharedValue(selected ? 1 : 0.82);

  useEffect(() => {
    scale.value = withSpring(selected ? 1 : 0.82, { damping: 12, stiffness: 180 });
  }, [selected, scale]);

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Marker
      coordinate={coordinate}
      title={title}
      description={description}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={selected ? 10 : 1}
    >
      <View style={{ width: PIN_WIDTH, height: PIN_HEIGHT }}>
        <View
          style={{
            position: 'absolute',
            bottom: 1,
            alignSelf: 'center',
            width: 10,
            height: 4,
            borderRadius: 999,
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
        />
        <Animated.View style={pinStyle}>
          <Svg width={PIN_WIDTH} height={PIN_HEIGHT} viewBox="0 0 24 24">
            <Path
              d={PIN_PATH}
              fill={selected ? SELECTED_COLOR : IDLE_COLOR}
              stroke="#0a0a06"
              strokeWidth={0.75}
            />
            <Circle cx={12} cy={9.5} r={3.1} fill={selected ? SELECTED_DOT_COLOR : IDLE_DOT_COLOR} />
          </Svg>
        </Animated.View>
      </View>
    </Marker>
  );
}

import { View } from 'react-native';
import { Marker, type LatLng } from 'react-native-maps';

import { cn } from '@/lib/utils';

interface StationMarkerProps {
  coordinate: LatLng;
  title: string;
  description?: string;
  selected?: boolean;
  onPress?: () => void;
}

export function StationMarker({ coordinate, title, description, selected, onPress }: StationMarkerProps) {
  return (
    <Marker
      coordinate={coordinate}
      title={title}
      description={description}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={selected ? 10 : 1}
    >
      <View
        className={cn(
          'items-center justify-center rounded-full border-2 shadow-lg shadow-black/40',
          selected ? 'h-11 w-11 border-primary-foreground/70 bg-primary' : 'h-8 w-8 border-background/50 bg-muted'
        )}
      >
        <View className={cn('rounded-full', selected ? 'h-3.5 w-3.5 bg-primary-foreground' : 'h-2.5 w-2.5 bg-muted-foreground')} />
      </View>
    </Marker>
  );
}

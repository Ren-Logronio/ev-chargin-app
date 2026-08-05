import { getDefaultConfig } from 'expo/metro-config';
import { withNativeWind } from 'nativewind/metro';
import type { MetroConfig } from 'metro-config';

const config = getDefaultConfig(__dirname) as unknown as MetroConfig;

module.exports = withNativeWind(config, {
  input: './src/global.css',
  inlineRem: 16,
} as Parameters<typeof withNativeWind>[1]);

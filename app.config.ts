import 'tsx/cjs';
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  "name": "Electric Chargin App",
  "slug": "eca",
  "version": "1.0.0",
  "scheme": "eca",
  "web": {
    "bundler": "metro"
  },
  "android": {
    "googleServicesFile": "./google-services.json",
    "package": "com.innoendo.eca"
  },
  "ios": {
    "googleServicesFile": "./GoogleService-Info.plist",
  },
  "plugins": [
    "expo-router",
    "@react-native-firebase/app",
    [
      "@react-native-firebase/analytics",
      {
        "ios": {
          "withoutAdIdSupport": true,
          "googleAppMeasurementOnDeviceConversion": true
        }
      }
    ],
    [
      "expo-build-properties",
      {
        "ios": {
          "useFrameworks": "static",
          "forceStaticLinking": [
            "RNFBAnalytics",
            "RNFBApp",
            "RNFBAuth",
            "RNFBCrashlytics",
            "RNFBFirestore",
            "RNFBMessaging",
            "RNFBStorage",
            "RN"
          ]
        }
      }
    ]
  ],
  "experiments": {
    "typedRoutes": true
  }
};

export default config;

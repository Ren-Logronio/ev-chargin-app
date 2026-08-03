import 'tsx/cjs';
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  "name": "Electric Chargin App",
  "slug": "electric-charging-app",
  "owner": "reinrein",
  "version": "1.0.0",
  "scheme": "eca",
  "web": {
    "bundler": "metro"
  },
  "android": {
    "googleServicesFile": "./google-services.json",
    "package": "com.innoendo.eca",
    "config": {
      "googleMaps": {
        "apiKey": process.env.GOOGLE_MAPS_API_KEY
      }
    }
  },
  "ios": {
    "googleServicesFile": "./GoogleService-Info.plist",
    "bundleIdentifier": "com.innoendo.eca",
    "infoPlist": {
      "NSAppTransportSecurity": {
        "NSAllowsArbitraryLoads": false,
        "NSAllowsLocalNetworking": true
      }
    },
    "config": {
      "googleMapsApiKey": process.env.GOOGLE_MAPS_API_KEY
    }
  },
  "plugins": [
    "expo-router",
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "@react-native-firebase/crashlytics",
    "@react-native-firebase/messaging",
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
      "expo-location",
      {
        "locationWhenInUsePermission": "Allow $(PRODUCT_NAME) to access your location to find nearby charging stations and show directions."
      }
    ],
    [
      "expo-notifications",
      {
        "mode": process.env.EAS_BUILD_PROFILE === "production" ? "production" : "development"
      }
    ],
    [
      "expo-image-picker",
      {
        "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to upload images.",
        "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to take photos."
      }
    ],
    [
      "expo-media-library",
      {
        "photosPermission": "Allow $(PRODUCT_NAME) to access your photo library.",
        "savePhotosPermission": "Allow $(PRODUCT_NAME) to save photos to your library."
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
  },
  "runtimeVersion": {
    "policy": "fingerprint"
  },
  "updates": {
    "url": "https://u.expo.dev/6b5b622c-859d-4e60-909c-136adc42bff4"
  },
  "extra": {
    "eas": {
      "projectId": "6b5b622c-859d-4e60-909c-136adc42bff4"
    }
  }
};

export default config;

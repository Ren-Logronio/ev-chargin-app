```javascript
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB-ob5AvHbCz6IKvtw8MCkGsNuMcN908T8",
  authDomain: "artiverse-440712.firebaseapp.com",
  databaseURL: "https://artiverse-440712-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "artiverse-440712",
  storageBucket: "artiverse-440712.firebasestorage.app",
  messagingSenderId: "1064456210195",
  appId: "1:1064456210195:web:0657c6495f699dfb41bce6",
  measurementId: "G-83Y7QYXVPX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
```

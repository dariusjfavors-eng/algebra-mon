// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA1Dgi7cE9pqz5ysyNuzCDbiLEctaXNgpg",
  authDomain: "algebra-mon.firebaseapp.com",
  projectId: "algebra-mon",
  storageBucket: "algebra-mon.appspot.com", // standard format
  messagingSenderId: "170929206205",
  appId: "1:170929206205:web:4b6086ec5798accb8698d4",
};

// DEBUG: prove what the app is using at runtime
// eslint-disable-next-line no-console
console.log("Firebase config in use:", {
  apiKeyStart: (firebaseConfig.apiKey ?? "").slice(0, 8),
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
});

const app = initializeApp(firebaseConfig);

// DEBUG: the app options Auth sees
// eslint-disable-next-line no-console
console.log("App options:", app.options);

export const auth = getAuth(app);
export const db = getFirestore(app);

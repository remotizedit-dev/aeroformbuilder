import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

const cleanEnv = (val: string | undefined) => val?.replace(/\r/g, "").trim();

const firebaseConfig = {
  apiKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) || "dummy-api-key-for-build-time",
  authDomain: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

console.log("Firebase config inside Next.js:", {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) + "..." : undefined
});

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const settings = {
  experimentalForceLongPolling: true,
};

// Sanitize the database ID to handle Windows carriage returns (\r) in .env.local
const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID?.replace(/\r/g, "").trim();

const db = (databaseId && databaseId !== "")
  ? initializeFirestore(app, settings, databaseId) 
  : initializeFirestore(app, settings);

const auth = getAuth(app);

export { app, db, auth };

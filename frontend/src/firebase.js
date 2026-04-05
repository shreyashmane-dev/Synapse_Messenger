import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBiLsyDD864Z610LRPhqY5Qslz-9dVJO8U",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "messenger-58954.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "messenger-58954",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "messenger-58954.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "652295591352",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:652295591352:web:75ae05f14e5515e78ceb4d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-J4E04HWBZB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

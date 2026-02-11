
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA6s4xcB4hcZU2jLOf0BctRkMmsUHuzdkE",
  authDomain: "ecotrack-backend.firebaseapp.com",
  projectId: "ecotrack-backend",
  storageBucket: "ecotrack-backend.firebasestorage.app",
  messagingSenderId: "355832822098",
  appId: "1:355832822098:web:37c5750efd74a7968d228b",
  measurementId: "G-NBHZES1NGJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

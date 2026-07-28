import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeeK9k3rTg21JOhX57GpPZjte_k0iO7XQ",
  authDomain: "lyfevault-f51d5.firebaseapp.com",
  projectId: "lyfevault-f51d5",
  storageBucket: "lyfevault-f51d5.firebasestorage.app",
  messagingSenderId: "933598045704",
  appId: "1:933598045704:web:e037d5787438dcf96113bd"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

import { initializeApp } from 'firebase/app';
import { getFirestore }   from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAh45C02y7U7mkUcxh98wlCZOublZhAQfY",
  authDomain: "rlfitness.firebaseapp.com",
  projectId: "rlfitness",
  storageBucket: "rlfitness.firebasestorage.app",
  messagingSenderId: "395675182752",
  appId: "1:395675182752:web:204d0196bfdbe00275cbc5",
  measurementId: "G-3TLP142CMQ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
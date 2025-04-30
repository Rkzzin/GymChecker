import { initializeApp } from 'firebase/app';
import { getFirestore }   from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCOQhJLaAbjhz5qlbqPcyUyAQOD1QdRmsY",
  authDomain: "rlfitness2.firebaseapp.com",
  projectId: "rlfitness2",
  storageBucket: "rlfitness2.firebasestorage.app",
  messagingSenderId: "371806704982",
  appId: "1:371806704982:web:1ac96ab2488ca68e70b2f7",
  measurementId: "G-V04JEWKZP5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
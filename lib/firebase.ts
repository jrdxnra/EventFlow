import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCWKe5E263RzbCNrU4-v4QkIcdjd1Ih9yo',
  authDomain: 'eventflow-exos.firebaseapp.com',
  projectId: 'eventflow-exos',
  storageBucket: 'eventflow-exos.firebasestorage.app',
  messagingSenderId: '305483031654',
  appId: '1:305483031654:web:52c948df7fb10b21a4b9a7',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); 
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Collection references
export const productsCol = collection(db, 'products');
export const sessionsCol = collection(db, 'sessions');
export const logsCol = collection(db, 'logs');
export const masterConfigsCol = collection(db, 'master_configs');
export const ingredientsCol = collection(db, 'ingredients');

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: 'kaian.jp' // Restrict to kaian.jp domain
});

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getFirebaseAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Firebase Admin credentials are not configured on the server.');
  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

export const firebaseAdminAuth = () => getAuth(getFirebaseAdminApp());

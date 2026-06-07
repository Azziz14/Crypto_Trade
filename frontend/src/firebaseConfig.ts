/**
 * Firebase Client SDK Configuration
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  COST      : 100% FREE on Spark Plan — No credit card required
 *  FREE TIER : Unlimited Email/Password Auth | 10,000 Phone SMS/month free
 *  SIGN UP   : https://console.firebase.google.com
 *
 *  SETUP STEPS:
 *   1. Go to https://console.firebase.google.com
 *   2. Click "Add project" → give it a name → create
 *   3. Project Settings (gear icon) → General → "Your apps"
 *   4. Click </> (Web) → Register app → copy the firebaseConfig values below
 *   5. Authentication → Sign-in method → Enable "Email/Password"
 *
 *  NOTE: The app works fine without Firebase configured — users can still
 *  log in with Email + OTP (backend-generated, sent via Brevo).
 *  Firebase is only needed for Google Sign-In or Phone Auth features.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

// ── Replace these with your actual Firebase project values ────────────────────
const firebaseConfig = {
  apiKey:            "YOUR_FIREBASE_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
// ─────────────────────────────────────────────────────────────────────────────

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

const isConfigured = firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY";

try {
  if (isConfigured) {
    firebaseApp  = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    console.log("[Firebase] Client SDK initialised ✓");
  } else {
    console.warn(
      "[Firebase] Not configured — edit src/firebaseConfig.ts to enable Google/Phone sign-in. " +
      "Email+OTP login works without Firebase."
    );
  }
} catch (err) {
  console.error("[Firebase] Initialisation failed:", err);
}

export { firebaseApp, firebaseAuth, isConfigured as firebaseIsConfigured };
export default firebaseConfig;

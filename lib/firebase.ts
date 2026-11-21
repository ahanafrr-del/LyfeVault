import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getFunctions } from "firebase/functions"

let client: ReturnType<typeof createFirebaseClient> | undefined

function createFirebaseClient() {
  if (typeof window === "undefined") {
    throw new Error("Firebase client services are only available in the browser.")
  }

  const config: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new Error("Firebase is not configured. Add the Firebase Web App environment variables.")
  }

  const app = getApps().length ? getApp() : initializeApp(config)
  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    functions: getFunctions(app, "us-central1"),
  }
}

export function getFirebaseClient() {
  return (client ??= createFirebaseClient())
}

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const serviceAccountPath = path.resolve(
    __dirname,
    "../../src/config/serviceAccount.json"
);

function initializeFirebase() {
  // Already initialized
  if (admin.apps.length) return;

  // 1) Jest / tests: don't require real credentials
  if (process.env.NODE_ENV === "test") {
    admin.initializeApp();
    return;
  }

  // 2) CI / production: from env variable if provided
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    return;
  }

  // 3) Local dev: from serviceAccount.json if it exists
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, "utf-8")
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    return;
  }

  // 4) Fails loudly only when really needed
  throw new Error(
      `Firebase service account not found at ${serviceAccountPath} and FIREBASE_SERVICE_ACCOUNT_JSON is not set`
  );
}

initializeFirebase();

export const db = admin.firestore();
export default admin;
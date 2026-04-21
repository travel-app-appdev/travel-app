// src/config/firebase.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Read the file manually instead of importing it directly
const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../src/config/serviceAccount.json'), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
export default admin;
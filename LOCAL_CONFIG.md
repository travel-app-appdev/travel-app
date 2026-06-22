# Votey team — local config (do not commit)

These files are **gitignored**. Keep your real copies on this machine only.

| File | Purpose |
|------|---------|
| `apps/backend/.env` | Backend env vars |
| `apps/backend/src/config/serviceAccount.json` | Firebase Admin key |
| `apps/frontend/google-services.json` | Android Firebase config |
| `apps/frontend/src/lib/firebase.ts` | Firebase web SDK config |
| `.firebaserc` | Firebase CLI project ID |

**First time setup:** copy `apps/frontend/src/lib/firebase.example.ts` → `firebase.ts` and paste your real values from Firebase Console.

**APK builds:** run `npm run android:build` from `apps/frontend`. Local `google-services.json` and `firebase.ts` are uploaded via `.easignore` even though they are not on GitHub.

Templates for all of the above are in the repo (`*.example` files).

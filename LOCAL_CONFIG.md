# Votey team — local config (do not commit)

These files are **gitignored**. Keep your real copies on this machine only.

| File | Purpose |
|------|---------|
| `apps/backend/.env` | Backend env vars |
| `apps/backend/src/config/serviceAccount.json` | Firebase Admin key |
| `apps/frontend/google-services.json` | Android Firebase config |
| `.firebaserc` | Firebase CLI project ID |

**Frontend Firebase web config:** copy `apps/frontend/src/lib/firebase.example.ts` → `firebase.ts` and paste your real values (or keep your existing `firebase.ts` locally).

**APK builds:** run `npm run android:build` from `apps/frontend`. Your local `google-services.json` is uploaded via `.easignore` even though it is not on GitHub.

Templates for all of the above are in the repo (`*.example` files).

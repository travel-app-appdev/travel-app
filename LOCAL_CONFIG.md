# Votey team — local config (do not commit)

These files are **gitignored**. Keep your real copies on this machine only.

| File | Purpose |
|------|---------|
| `apps/backend/.env` | Backend env vars |
| `apps/backend/src/config/serviceAccount.json` | Firebase Admin key |
| `apps/frontend/google-services.json` | Android Firebase config |
| `apps/frontend/src/lib/firebase.ts` | Firebase web SDK config |
| `.firebaserc` | Firebase CLI project ID |

**First time setup (or after pull):**

```bash
npm run setup:local
```

Then paste your real Firebase values into `firebase.ts` and add `serviceAccount.json` if needed.

**Lost your real config?** Restore from git history (team values):

```bash
git show b240eb5:apps/frontend/src/lib/firebase.ts > apps/frontend/src/lib/firebase.ts
git show b240eb5:apps/frontend/google-services.json > apps/frontend/google-services.json
git show b240eb5:.firebaserc > .firebaserc
```

**APK builds:** run `npm run android:build` from `apps/frontend`. Local `google-services.json` and `firebase.ts` are uploaded via `.easignore` even though they are not on GitHub.

Templates for all of the above are in the repo (`*.example` files).

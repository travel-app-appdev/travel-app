# Deployment Guide — Votey

This guide explains how to deploy Votey and each of its components.

---

## Distribution rights

Released under the **MIT License** ([LICENSE](./LICENSE)). You may deploy and modify the software; include the license text when you redistribute it.

---

## Overview

| Component | What it does | Where it runs |
|-----------|--------------|---------------|
| Firebase | Login + database | Firebase (Google Cloud) |
| Backend | REST API | Your Node.js server (HTTPS) |
| Mobile app | Android client | Built with Expo EAS |

Deploy in this order: **Firebase → backend → mobile app**.

---

## Files that are not on GitHub

These files contain secrets or personal project settings. **They are not in the repository.** After `git clone`, create each one using the steps below.

| File | In GitHub? | Location / action |
|------|------------|-------------------|
| Backend env template | Yes | `apps/backend/.env.example` → copy to `.env` |
| Backend env | **No** | `apps/backend/.env` |
| Service account key | **No** | `apps/backend/src/config/serviceAccount.json` |
| Android Firebase template | Yes | `apps/frontend/google-services.json.example` |
| Android Firebase config | **No** (gitignored) | `apps/frontend/google-services.json` — download from Firebase (Step 1.4) |
| Web Firebase template | Yes | `apps/frontend/src/lib/firebase.example.ts` |
| Web Firebase config | **No** (gitignored) | Copy example → `apps/frontend/src/lib/firebase.ts` (Step 1.5) |

A template for the backend env file is included: `apps/backend/.env.example`.

---

## Step 1 — Create a Firebase project

### 1.1 New project

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Copy the **Project ID** from **Project settings**.

### 1.2 Authentication

1. **Build → Authentication → Sign-in method**
2. Enable **Email/Password**.

### 1.3 Firestore

1. **Build → Firestore Database → Create database**
2. Pick a region and start in production mode.

### 1.4 Create `google-services.json`

This file is **gitignored and not on GitHub**. Download it from Firebase:

1. **Project settings → Your apps** → add an **Android** app.
2. Package name: same as in `apps/frontend/app.json` (`expo.android.package`, default `com.anonymous.frontend`).
3. Download **`google-services.json`**.
4. Save it here:

```
apps/frontend/google-services.json
```

See `google-services.json.example` for the expected structure.

### 1.5 Create `firebase.ts`

This file is **gitignored and not on GitHub**.

1. In **Project settings**, add a **Web** app (`</>` icon).
2. Copy the `firebaseConfig` object Firebase shows you.
3. Copy the template: `cp apps/frontend/src/lib/firebase.example.ts apps/frontend/src/lib/firebase.ts`
4. Paste your values into the `firebaseConfig` block in `firebase.ts`.

### 1.6 Create `serviceAccount.json`

This file is **not on GitHub**. The backend needs it to talk to Firebase:

1. **Project settings → Service accounts**
2. **Generate new private key** → download the JSON file.
3. Save it here:

```
apps/backend/src/config/serviceAccount.json
```

Never commit this file.

---

## Step 2 — Create the backend `.env` file

This file is **not on GitHub**.

```bash
cd apps/backend
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
FIREBASE_PROJECT_ID=your-project-id-from-step-1
GEOAPIFY_API_KEY=your-key-from-geoapify.com
```

Get a free Geoapify key at [geoapify.com](https://www.geoapify.com/) (used for destination search).

---

## Step 3 — Run locally

### Backend

```bash
cd apps/backend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — expect `{"message":"Travel API is running!"}`.

### Frontend

```bash
cd apps/frontend
npm install
EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start
```

On a phone, use your computer’s IP instead of `localhost` (e.g. `http://192.168.1.5:3000`).

---

## Step 4 — Deploy the backend to a server

Your API needs a public **HTTPS** URL (e.g. `https://api.myapp.com`).

### Build

```bash
cd apps/backend
npm ci
npm run build
```

### Upload to server

Copy `dist/`, `package.json`, and `package-lock.json` to your server, then:

```bash
npm ci --omit=dev
```

### Environment on the server

Create `.env` on the server (same variables as Step 2). On a server you can use `FIREBASE_SERVICE_ACCOUNT_JSON` instead of a file — paste the whole JSON as one line.

```bash
node dist/index.js
```

Use PM2 or systemd so it keeps running.

Verify: `curl https://YOUR_API_URL/` → health JSON response.

---

## Step 5 — Build the Android app

Uses [Expo EAS Build](https://docs.expo.dev/build/introduction/).

### Setup

```bash
npm install -g eas-cli
cd apps/frontend
eas login
```

### Point the app at your backend

In `apps/frontend/eas.json`, set your API URL for the `preview` and `production` profiles:

```json
"EXPO_PUBLIC_API_URL": "https://YOUR_API_URL"
```

Also update `apps/frontend/app.json` → `android.intentFilters` → `data.host` to your API hostname (without `https://`).

### Build APK

```bash
npm ci
eas build --platform android --profile preview
```

Download the APK from [expo.dev](https://expo.dev).

---

## Checklist

- [ ] Firebase project created (Auth + Firestore)
- [ ] `google-services.json` created and saved in `apps/frontend/`
- [ ] `firebase.ts` updated with my web config
- [ ] `serviceAccount.json` created in `apps/backend/src/config/`
- [ ] `.env` created from `.env.example` in `apps/backend/`
- [ ] Backend runs locally on port 3000
- [ ] Backend deployed to HTTPS URL
- [ ] `eas.json` updated with my API URL
- [ ] APK built and tested on a device

---

## Environment variables summary

### Backend (`apps/backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Default `3000` |
| `FIREBASE_PROJECT_ID` | Yes | Your Firebase Project ID |
| `GEOAPIFY_API_KEY` | Yes | Geoapify API key |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | On server | Alternative to `serviceAccount.json` file |

### Mobile app (in `eas.json` or shell)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | Your backend URL |
| `EXPO_PUBLIC_USE_FIREBASE_EMULATOR` | No | `true` for local emulators only |

---

## License

MIT — [LICENSE](./LICENSE)

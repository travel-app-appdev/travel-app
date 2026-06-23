# Votey

Votey is a collaborative travel planning app designed to help groups organize trips more easily. Instead of relying on messy group chats, Votey lets users suggest activities, vote together, and build a shared itinerary in a structured and fair way. Invite friends with a trip code, follow the final plan while you travel, and collect photos together in a shared memories gallery afterwards.

---

## Distribution rights

This project is released under the **MIT License**. See [LICENSE](./LICENSE).

You may use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software, provided the copyright and permission notices in [LICENSE](./LICENSE) are included in all copies or substantial portions.

Copyright (c) 2026 travel-app-appdev.

---

## How a trip works — 4 phases

Every trip moves through **four phases** in order. The trip admin sets deadlines for Planning and Voting when the trip is created.

```
Planning  →  Voting  →  Final  →  Memories
```

| Phase | What happens |
|-------|----------------|
| **Planning** | Members join the trip (invite code or link) and fill the itinerary — add activities to time slots (breakfast, lunch, evening, etc.). Each member taps **Finish planning** when they are done. When **everyone** has finished (or the planning deadline passes), the trip moves on automatically. |
| **Voting** | The group **votes on activities** for each open slot. Members pick their favourites; the app uses the results to decide what goes into the shared plan. When voting ends (deadline or admin finishes voting), the trip moves to Final. *Solo trips can skip Voting and go straight to Final.* |
| **Final** | The **locked itinerary** is ready — the group’s chosen activities per day and time slot. During the trip, members can mark **attendance** on activities (who is joining). This is the “live” plan you follow while travelling. |
| **Memories** | After the **trip start date**, the group can **upload and browse trip photos** in a shared gallery (JPEG, PNG, or WebP). Members can add memories from the trip and view what others shared. |

The home screen and trip overview show which phase is active. Push notifications inform members when a phase changes.

---

## What you need to deploy

The app has three technical parts:

| Part | Technology |
|------|------------|
| **Mobile app** | Expo / React Native (Android) |
| **Backend API** | Node.js / Express |
| **Firebase** | Authentication + Firestore |

---

## Files that are not on GitHub

When you clone the repository, **secret and environment files are missing on purpose**. They are listed in `.gitignore` and are not pushed to GitHub.

You must **create them yourself** before the app can run. Step-by-step instructions: **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

| File you need to create | Where |
|-------------------------|--------|
| Backend environment | `apps/backend/.env` ← copy from `.env.example` |
| Firebase service account (backend) | `apps/backend/src/config/serviceAccount.json` |
| Android Firebase config | `apps/frontend/google-services.json` ← see template `google-services.json.example` |
| Firebase web config | `apps/frontend/src/lib/firebase.ts` (gitignored — copy from `firebase.example.ts`) |

---

## Quick start (after creating the missing files)

```bash
git clone https://github.com/travel-app-appdev/travel-app.git
cd travel-app

# Backend — see DEPLOYMENT.md for .env and serviceAccount.json first
cd apps/backend
cp .env.example .env
npm install
npm run dev

# Frontend — see DEPLOYMENT.md for google-services.json and firebase.ts first
cd ../frontend
npm install
npx expo start
```

**Full deployment guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Tests

```bash
cd apps/frontend && npm test
cd apps/backend && npm test
```

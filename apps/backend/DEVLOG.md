# Backend Dev Log — Milena

## 18.03.2026 — Initial Setup

### What I did today:
- Initialized Node.js + TypeScript + Express project
- Connected Firebase Admin SDK and Firestore database
- Configured tsconfig.json for CommonJS modules
- Set up environment variables with dotenv
- Created project folder structure
- Server runs on http://localhost:3000

### How to run the project:
1. Install dependencies: `npm install`
2. Create `.env` file based on `.env.example`
3. Add `serviceAccount.json` to `src/config/` (ask Milena for the file!)
4. Run: `npm run dev`

### Installed packages:
**Dependencies:**
- express — web framework
- firebase-admin — Firebase/Firestore connection
- dotenv — environment variables
- cors — cross-origin requests

**Dev Dependencies:**
- typescript — TypeScript compiler
- ts-node — run TypeScript directly
- nodemon — auto-restart on file changes
- @types/express, @types/cors, @types/node — TypeScript types

### Folder structure:
src/
├── config/
│   └── firebase.ts       # Firebase connection
├── controllers/          # Business logic (coming soon)
├── middleware/            # Auth, validation (coming soon)
├── routes/               # API endpoints (coming soon)
└── index.ts              # Server entry point

### Important notes:
- serviceAccount.json is NEVER pushed to GitHub (contains secret keys!)
- .env is NEVER pushed to GitHub
- Ask Milena for serviceAccount.json if you need to run the backend locally

## 25.03.2026 — Authentication (Google Sign-In)

### What I did today:
- Implemented Google Sign-In authentication flow on the backend
- Created `authController.ts` — verifies Firebase ID token sent from frontend,
  creates or updates user document in Firestore on login
- Created `routes/auth.ts` — registers POST /auth/login route
- Registered auth routes in `index.ts` under `/auth`
- Added Postman workspace config (`.postman/`) for API testing

### New folder structure:
src/
├── config/
│   └── firebase.ts           # Firebase connection
├── controllers/
│   └── authController.ts     # Google login logic
├── middleware/                # Auth, validation (coming soon)
├── routes/
│   └── auth.ts               # POST /auth/login
└── index.ts                  # Server entry point

### How authentication works:
1. Frontend sends Google ID token to POST /auth/login
2. Backend verifies token using Firebase Admin SDK
3. User is created or updated in Firestore (merge: true)
4. Backend returns uid, email and name to frontend

### API Endpoints added:
| Method | Endpoint     | Description                        |
|--------|--------------|------------------------------------|
| POST   | /auth/login  | Verify Google token, save user     |

### Important notes:
- Frontend still needs to implement Google Sign-In button 
- Route is currently /auth/login — needs to be aligned with frontend
- Postman can be used to test the endpoint locally without the frontend

## 06.04.2026 — Registration (Email & Password)

### What I did today:
- Added email/password registration endpoint to the backend
- Fixed a Firebase initialization bug in `firebase.ts`
- Enabled Email/Password sign-in in Firebase Console
- Tested registration successfully with Postman

### What I added:
- New function `register` in `authController.ts` — creates a new user in
  Firebase Auth and saves their data in Firestore
- New route POST `/auth/register` in `routes/auth.ts`

### Bugs we ran into and how we fixed them:

**Bug 1: 500 Internal Server Error — "Registration failed"**
- The error was not descriptive enough, so we added `console.error` to the
  catch block to see the real error message in the terminal

**Bug 2: Email/Password provider not enabled**
- Firebase by default does not allow email/password login
- Fixed by going to Firebase Console → Authentication → Sign-in method →
  Email/Password → Enable

**Bug 3: "Cannot set property project_id of #<Object> which has only a getter"**
- This happened because TypeScript imports JSON files as readonly objects,
  and Firebase tried to modify it which caused a crash
- Fixed by reading `serviceAccount.json` manually using `fs.readFileSync`
  instead of importing it directly

### How registration works:
1. Frontend sends email, password and name to POST /auth/register
2. Backend creates user in Firebase Auth
3. Backend saves user document in Firestore with uid, email, name, createdAt
4. Backend returns uid, email and name to frontend

### API Endpoints added:
| Method | Endpoint        | Description                        |
|--------|-----------------|------------------------------------|
| POST   | /auth/login     | Verify Google token, save user     |
| POST   | /auth/register  | Create new user with email/password|

### Important notes:
- Registered users appear in Firebase Console under Authentication → Users
- User data is also saved in Firestore under the `users` collection
- Postman was used to test the endpoint (Body → raw → JSON)
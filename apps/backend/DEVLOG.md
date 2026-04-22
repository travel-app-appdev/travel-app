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

## 19.04.2026 — Join Trip via Invite Code

### What I did today:
- Implemented join trip functionality via invite code
- Added invite code generation when creating a trip
- Refactored codebase to follow layered architecture (controller → service → repository)
- Deployed backend to university cloud server via FileZilla
- Fixed Node.js version (upgraded to v24 via nvm)
- Fixed uuid package version conflict with Jest (downgraded to uuid@9)

### What I added:
- New endpoint POST `/trips/join` — allows a user to join a trip using an invite code
- `invite_code` is now generated automatically when a trip is created (using uuid)
- New functions in `tripsRepository.ts`:
  - `findTripByInviteCode` — finds a trip by invite code
  - `findMembership` — checks if user is already a member
  - `addTripMember` — adds user as member to a trip
  - `createTripWithInviteCode` — creates trip with invite code
- New function in `tripsService.ts`:
  - `joinTripWithInviteCode` — validates invite and adds user as member
- Added `JoinTripInput` type to `types/trip.ts`
- Added `invite_code` field to `Trip` type
- Unit tests for join trip endpoint

### How join trip works:
1. User A creates a trip → backend generates a unique invite code
2. User A shares the invite code with friends
3. Friend sends POST /trips/join with their idToken and the invite code
4. Backend verifies the token, finds the trip, checks for duplicate membership
5. Friend is added as a member with role "member"
6. Trip appears in friend's "Your Trips"

### Bugs we ran into and how we fixed them:

**Bug 1: uuid@13 incompatible with Jest**
- uuid v13 uses ESM modules which Jest (CommonJS) cannot parse
- Fixed by downgrading to uuid@9

**Bug 2: Duplicate function declaration in tripsService.ts**
- Accidentally declared `createTripForAuthenticatedUser` twice
- Fixed by replacing the old version instead of adding a new one

**Bug 3: Server not starting on university cloud**
- Server was trying to run `index.ts` directly instead of compiled JS
- Fixed by changing startup command to `node dist/index.js` in server config

**Bug 4: serviceAccount.json not found in dist/config/**
- After building, `dist/` folder does not contain `serviceAccount.json`
- Fixed by updating the path in `firebase.ts` to point to `src/config/serviceAccount.json`

### API Endpoints added:
| Method | Endpoint        | Description                              |
|--------|-----------------|------------------------------------------|
| POST   | /auth/login     | Verify Google token, save user           |
| POST   | /auth/register  | Create new user with email/password      |
| GET    | /trips/my       | Get all trips for a user                 |
| POST   | /trips/         | Create a new trip (generates invite code)|
| POST   | /trips/join     | Join a trip via invite code              |

### Deployment:
- Backend is now live at: https://cc231001-11012.node.ustp.cloud
- Files uploaded via FileZilla (SFTP)
- Server runs `node dist/index.js` on Node.js 22 LTS
- To update: build locally → upload new dist/ via FileZilla → restart server

### Important notes:
- `invite_code` is returned in the response when creating a trip — frontend should save it
- Frontend uses the invite code to call POST /trips/join on behalf of the new member
- All tests pass: 15/15

## 22.04.2026 — Itinerary Timeslot Generation

### What I did today:
- Implemented automatic itinerary generation for trips
- Each day between trip start and end date gets 8 timeslots (06:00–22:00)
- Timeslots are saved to Firestore and can be retrieved via GET endpoint
- Written unit tests for timeslot generation logic
- Fixed a bug where old Node process was blocking the new server

### What I added:

**New files:**
- `src/__helpers__/itineraryHelper.ts` — pure functions for generating timeslots
  - `generateDaySlots()` — returns 8 slots for one day
  - `generateItinerary()` — generates slots for all days between start and end date
- `src/repositories/itineraryRepository.ts` — Firestore operations for itinerary
  - `saveItinerary()` — saves all days and slots to Firestore
  - `getItineraryByTripId()` — retrieves itinerary from Firestore
- `src/services/itineraryService.ts` — business logic
  - `generateAndSaveItinerary()` — finds trip, validates dates, generates and saves itinerary
  - `getItinerary()` — retrieves itinerary or throws 404
- `src/controllers/itineraryController.ts` — handles HTTP requests
  - `generateItineraryController` — handles POST /itinerary/:tripId/generate
  - `getItineraryController` — handles GET /trips/:id/itinerary
- `src/routes/itinerary.ts` — registers itinerary routes
- `src/__tests__/itinerary.test.ts` — unit tests for helper functions

**Updated files:**
- `src/types/trip.ts` — added TimeSlot, ItineraryDay, Itinerary types
- `src/routes/trips.ts` — added GET /:id/itinerary route
- `src/index.ts` — registered itinerary router under /itinerary

### How itinerary generation works:
1. Frontend sends POST /itinerary/:tripId/generate
2. Backend finds the trip in Firestore to get start and end dates
3. Backend generates 8 timeslots for each day between start and end
4. All slots are saved to Firestore under the `itinerary` collection
5. Backend returns the full itinerary to frontend
6. Frontend can fetch it later via GET /trips/:id/itinerary

### Timeslot format:
Each day has 8 slots:
- 06:00-08:00, 08:00-10:00, 10:00-12:00, 12:00-14:00
- 14:00-16:00, 16:00-18:00, 18:00-20:00, 20:00-22:00
- Each slot starts with `activityId: null` — filled in later during voting

### Bugs we ran into and how we fixed them:

**Bug 1: Cannot POST /itinerary/:tripId/generate**
- Route was registered correctly but old Node.js process was still running
  on port 3000 from a previous session and intercepting all requests
- Fixed by running `taskkill /F /IM node.exe` to kill all Node processes
  and restarting the server

**Bug 2: TypeScript error — string | string[] not assignable to string**
- `req.params` values can technically be arrays in Express types
- Fixed by using `String(req.params.tripId)` to explicitly cast to string

### API Endpoints added:
| Method | Endpoint                        | Description                        |
|--------|---------------------------------|------------------------------------|
| POST   | /auth/login                     | Verify Google token, save user     |
| POST   | /auth/register                  | Create new user with email/password|
| GET    | /trips/my                       | Get all trips for a user           |
| POST   | /trips/                         | Create trip (generates invite code)|
| POST   | /trips/join                     | Join a trip via invite code        |
| POST   | /itinerary/:tripId/generate     | Generate & save timeslots          |
| GET    | /trips/:id/itinerary            | Get itinerary for a trip           |

### Tests:
- 23/23 tests passing
- New tests cover: `generateDaySlots()` and `generateItinerary()` functions
- Tests check: correct number of slots, correct slot times, correct trip_id, correct number of days
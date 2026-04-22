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
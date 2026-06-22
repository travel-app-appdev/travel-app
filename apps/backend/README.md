# Votey — Backend

Node.js + Express + TypeScript + Firebase.

**Full deployment guide:** [DEPLOYMENT.md](../../DEPLOYMENT.md)

## Files you must create (not on GitHub)

| File | Path |
|------|------|
| Environment variables | `apps/backend/.env` ← copy from `.env.example` |
| Firebase service account | `apps/backend/src/config/serviceAccount.json` |

See [DEPLOYMENT.md](../../DEPLOYMENT.md) Steps 1.6 and 2 for how to get these from Firebase.

## Run locally

```bash
git clone https://github.com/travel-app-appdev/travel-app.git
cd travel-app/apps/backend
cp .env.example .env
# Create src/config/serviceAccount.json — see DEPLOYMENT.md
npm install
npm run dev
```

Server: [http://localhost:3000](http://localhost:3000)

## Build for production

```bash
npm run build
npm start
```

## Tests

```bash
npm test
```

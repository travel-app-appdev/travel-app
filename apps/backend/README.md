# TripVote — Backend

Node.js + Express + TypeScript + Firebase

## Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm

## Getting Started

### 1. Clone the repository
git clone https://github.com/travel-app-appdev/travel-app.git
cd travel-app/apps/backend

### 2. Install dependencies
npm install

This will install all required packages:
- express — web framework
- firebase-admin — Firebase/Firestore connection
- dotenv — environment variables
- cors — cross-origin requests
- typescript, ts-node, nodemon — TypeScript support

### 3. Set up environment variables
Create a `.env` file in `apps/backend/` and add:

FIREBASE_PROJECT_ID=travel-app-66233
PORT=3000

### 4. Add Firebase service account
Ask Milena for `serviceAccount.json` and place it in:
apps/backend/src/config/serviceAccount.json

⚠️ Never commit this file to GitHub!

### 5. Run the development server
npm run dev

Server will start at http://localhost:3000

## Project Structure

src/
├── config/         # Firebase and app configuration
├── controllers/    # Business logic
├── middleware/     # Auth, validation
├── routes/         # API endpoints
└── index.ts        # Entry point
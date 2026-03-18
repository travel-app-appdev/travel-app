# TripVote — Backend

Node.js + Express + TypeScript + Firebase

## Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm

## Getting Started

### 1. Clone the repository
git clone https://github.com/ИМЯ-ОРГАНИЗАЦИИ/tripvote.git
cd tripvote/apps/backend

### 2. Install dependencies
npm install

### 3. Set up environment variables
Copy `.env.example` to `.env` and fill in the values:
cp .env.example .env

### 4. Run the development server
npm run dev

## Project Structure

src/
├── config/         # Firebase and app configuration
├── controllers/    # Business logic
├── middleware/     # Auth, validation
├── routes/         # API endpoints
└── index.ts        # Entry point

## Environment Variables

See `.env.example` for required variables.
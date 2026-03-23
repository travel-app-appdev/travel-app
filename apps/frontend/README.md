# Frontend – Travel App

## Overview
This is the frontend of the Travel App project.  
It is built with **Expo, React Native, and TypeScript**.

The app is primarily developed for **Android**, while the **web version** can be used for quick previews during development.

## Tech Stack
- Expo
- React Native
- TypeScript
- Expo Router (file-based routing)

## Prerequisites
Make sure you have installed:

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (comes with Node.js)
- Git
- VS Code

For Android development:
- Android Studio (with emulator) OR an Android Phone

Optional:
- Expo Go app on Android device

## Getting started

### 1. Clone the repository
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

### 2. Navigate to frontend folder
   ```bash
   cd apps/frontend
   ```

### 3. Install dependencies
   ```bash
   npm install
   ```

## Running the App

### 1. Start the development server 
   ```bash
   npx expo start
   ```

### 2. Run in the browser (quick preview)
   ```bash
   npm run web
   ```

### 3. Run on Android
   ```bash
   npm run android
   ```

## Development Notes
- The app uses file-based routing via the app/folder.
- Each file inside app/ represents a screen/route.
- Focus development on Android behavior.
- The web version is only for quick testing and UI preview.

## Project Structure
apps/frontend
  app/                # Screens and routes (Expo Router)
  src/
    components/       # Reusable UI components
      common/
      trip/
      voting/
    services/         # API and business logic
      api/
      auth/
      trip/
    types/            # TypeScript types
    utils/            # Helper functions
    theme/            # Styling and theme
    constants/        # App constants
  assets/             # Images and icons


## Git & Important Notes
**Do NOT commit:**
- node_modules/
- .expo/
- .env files
- personal editor settings (e.g. .vscode/)

After pulling changes:
   ```bash
   npm install
   ```

## Troubleshooting

### 1. App does not start
   ```bash
   npx expo start
   ```

### 2. Dependencies missing
   ```bash
   npm install
   ```

### 3. Android not working
- Make sure Android Studio is installed
- Start an emulator before running:
  
```bash
npm run android
```

## Workflow
- Create a feature branch before starting work
- Pull latest changes before coding
- Test locally before committing
- Keep commits small and meaningful
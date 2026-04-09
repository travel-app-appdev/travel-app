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
# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

## Running the App

### 1. Start the development server 
2. Start the app

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
In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

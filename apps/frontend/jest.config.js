// apps/frontend/jest.config.js
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
  testPathIgnorePatterns: ["/node_modules/", "/app/"],
  transformIgnorePatterns: [
    "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|firebase|@firebase/.*))",
  ],
  moduleNameMapper: {
    // firebase.ts is gitignored; use the committed example for test resolution.
    "^@/src/lib/firebase$": "<rootDir>/src/lib/firebase.example.ts",
    "^@/(.*)$": "<rootDir>/$1",
  },
  maxWorkers: 2,
};

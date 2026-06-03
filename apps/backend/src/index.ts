//apps/backend/src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import tripsRouter from "./routes/trips";
import itineraryRouter from "./routes/itinerary";
import activitiesRouter from "./routes/activities";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// ── Android deep link verification ──
// Required for Android App Links to work with the invite flow.
// Must be served at /.well-known/assetlinks.json over HTTPS.
// Debug SHA256 is used for development builds.
// EAS release SHA256 is used for builds created with eas build.
app.get("/.well-known/assetlinks.json", (_req, res) => {
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.anonymous.frontend",
        sha256_cert_fingerprints: [
          "E4:28:B5:14:E5:0B:81:56:E7:7D:40:CA:B3:DC:1F:18:73:86:BD:5C:2E:24:79:88:A8:12:A4:B4:DF:A7:65:BB", // debug
          "D5:73:57:64:E6:FC:84:55:7B:83:B7:65:AA:E7:46:70:4D:6A:75:AB:97:EB:3F:4B:EB:FD:5C:72:4D:85:F2:1E", // EAS release
        ],
      },
    },
  ]);
});

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startedAt;
    console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
    );
  });

  next();
});

app.use("/auth", authRoutes);
app.use("/activities", activitiesRouter);
app.use("/itinerary", itineraryRouter);
app.use("/trips", tripsRouter);

app.get("/", (_req, res) => {
  res.json({ message: "Travel API is running!" });
});

if (process.env.JEST_WORKER_ID === undefined) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
//apps/backend/src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import tripsRouter from "./routes/trips";
import itineraryRouter from "./routes/itinerary";
import activitiesRouter from "./routes/activities";
import autocompleteRouter from "./routes/autocomplete";

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

// ── Invite fallback page ──
// Shown when a user opens the invite link in a browser without the app installed.
// If the app IS installed, Android intercepts the link and opens the app directly
// without ever hitting this route.
app.get("/invite", (req, res) => {
  const code = req.query.code as string;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Join trip on Votey</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background-color: #F7CE46;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }

          .card {
            background: #FFFEF5;
            border-radius: 28px;
            border: 2px solid #140D0A;
            padding: 32px 24px;
            max-width: 380px;
            width: 100%;
            text-align: center;
            gap: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          h1 {
            font-size: 28px;
            font-weight: 900;
            color: #140D0A;
          }

          .subtitle {
            font-size: 16px;
            color: #140D0A;
            line-height: 1.5;
          }

          .code-label {
            font-size: 14px;
            color: #767676;
            margin-top: 8px;
          }

          .code {
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 6px;
            color: #140D0A;
            background: #F7CE46;
            borderRadius: 12px;
            padding: 12px 24px;
            border-radius: 12px;
            margin: 4px 0;
          }

          .divider {
            width: 100%;
            height: 1px;
            background: #D9D9D9;
            margin: 8px 0;
          }

          .download-label {
            font-size: 16px;
            font-weight: 700;
            color: #140D0A;
          }

          .button {
            display: inline-block;
            background: #F77646;
            color: #140D0A;
            padding: 16px 32px;
            border-radius: 999px;
            font-size: 16px;
            font-weight: 700;
            text-decoration: none;
            width: 100%;
            transition: opacity 0.2s;
          }

          .button:hover {
            opacity: 0.85;
          }

          .hint {
            font-size: 13px;
            color: #767676;
            line-height: 1.5;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>You're invited! ✈️</h1>

          <p class="subtitle">
            Someone wants you to join their trip on <strong>Votey</strong>.
          </p>

          <p class="code-label">Your invite code</p>
          <div class="code">${code ?? "——"}</div>

          <div class="divider"></div>

          <p class="download-label">Get the app to join</p>

          <a class="button" href="https://github.com/MClair-design/Votey-Website" target="_blank">
            Download Votey
          </a>

          <p class="hint">
            Already have the app? Open it and enter the invite code above,
            or ask the trip admin to share the link again after you install.
          </p>
        </div>
      </body>
    </html>
  `);
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
app.use("/autocomplete", autocompleteRouter);

app.get("/", (_req, res) => {
  res.json({ message: "Travel API is running!" });
});

if (process.env.JEST_WORKER_ID === undefined) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
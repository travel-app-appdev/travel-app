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

app.use("/auth", authRoutes);
app.use("/activities", activitiesRouter);
app.use("/itinerary", itineraryRouter);
app.use("/trips", tripsRouter);

app.get("/", (_req, res) => {
  res.json({ message: "Travel API is running!" });
});

// Only start HTTP listener when NOT under Jest
if (process.env.JEST_WORKER_ID === undefined) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;

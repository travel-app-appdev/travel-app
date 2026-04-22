import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import tripsRouter from "./routes/trips";
import itineraryRouter from "./routes/itinerary";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/itinerary", itineraryRouter);
app.use("/trips", tripsRouter);

app.get("/", (req, res) => {
  res.json({ message: "Travel API is running!" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
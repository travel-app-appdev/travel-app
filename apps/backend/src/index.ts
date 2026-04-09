import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/firebase';
import tripsRouter from "./routes/trips";
import authRoutes from "./routes/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/trips", tripsRouter);
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Travel API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
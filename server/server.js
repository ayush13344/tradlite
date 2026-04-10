import express from 'express';
import cors from 'cors';
import "dotenv/config";
import connectDB from './configs/db.js';
import UserRoutes from "./routes/UserRoutes.js";
import OrderRoutes from "./routes/OrderRoutes.js";
import "./services/MultiTImeFrameEngine.js";
import StockRoutes from "./routes/StockRoutes.js";
import marketRoutes from "./routes/MarkeTROutes.js";
import HoldingRoutes from "./routes/HoldingRoutes.js";
import CryptoRoutes from "./routes/CryptoRoutes.js";
import TradeJournalRoutes from "./routes/TradeJournalRoutes.js";
import mlRoutes from "./routes/mlRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

//databse connection
await connectDB();

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173", // your Vite frontend
  credentials: true
}));

app.use("/api/users", UserRoutes);
app.use("/api/orders", OrderRoutes);
app.use("/api/stocks", StockRoutes );
app.use("/api/market", marketRoutes);
app.use("/api/holdings", HoldingRoutes);
app.use("/api/crypto", CryptoRoutes);
app.use("/api/trade-journal", TradeJournalRoutes);
app.use("/api/ml", mlRoutes);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  change: { type: String, required: true },
});

export default mongoose.model("Stock", stockSchema);
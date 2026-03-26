import mongoose from "mongoose";

const holdingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    avgPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    currentPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    sector: {
      type: String,
      trim: true,
      default: "Others",
    },

    mode: {
      type: String,
      enum: ["INTRADAY", "DELIVERY"],
      required: true,
    },
  },
  { timestamps: true }
);

holdingSchema.index({ userId: 1, symbol: 1, mode: 1 }, { unique: true });

const Holding = mongoose.model("Holding", holdingSchema);

export default Holding;
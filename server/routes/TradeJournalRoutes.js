import express from "express";
import {
  createTradeJournal,
  closeTradeJournal,
  getTradeJournals,
  getSingleJournal,
} from "../controller/TradeJournalController.js";

const router = express.Router();

/* ===================== ROUTES ===================== */

// create entry (BUY)
router.post("/create", createTradeJournal);

// close entry (SELL / EXIT)
router.post("/close", closeTradeJournal);

// get all journals (with optional filters)
router.get("/:userId", getTradeJournals);

// get single journal
router.get("/single/:journalId", getSingleJournal);

export default router;
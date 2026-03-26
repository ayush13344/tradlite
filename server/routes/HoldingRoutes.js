  import express from "express";
  import {
    createHolding,
    getUserHoldings,
    getHoldingById,
    updateHolding,
    deleteHolding,
  } from "../controller/HoldingController.js";

  const router = express.Router();

  router.post("/", createHolding);
  router.get("/user/:userId", getUserHoldings);
  router.get("/:holdingId", getHoldingById);
  router.put("/:holdingId", updateHolding);
  router.delete("/:holdingId", deleteHolding);

  export default router;
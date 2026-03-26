import express from "express";
import {
  placeOrder,
  getUserOrders,
  getOrderById,
  deleteOrder,
} from "../controller/OrderController.js";

const router = express.Router();

router.post("/place", placeOrder);
router.get("/user/:userId", getUserOrders);
router.get("/:orderId", getOrderById);
router.delete("/:orderId", deleteOrder);

export default router;
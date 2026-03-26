import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/authSlice";
import portfolioReducer from "./features/portfolioSlice";
import orderReducer from "./features/orderSlice";
import marketReducer from "./features/marketSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    portfolio: portfolioReducer,
    orders: orderReducer,
    market: marketReducer,
  },
});
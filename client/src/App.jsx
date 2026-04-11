import React from "react";
import { Route, Routes } from "react-router-dom";
import MainLayout from "./pages/MainLayout";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Charts from "./pages/Charts";
import MarketPage from "./pages/MarketPage";
import HoldingsPage from "./pages/Holdings";
import OrdersPage from "./pages/Orders";
import CryptoMarketPage from "./pages/CryptoMarketPage";
import TradeJournalPage from "./pages/TradeJournal";
import MlTestPage from "./pages/MlTestPage";
import StockMLPage from "./pages/StockMlPage";



const App=()=>{
  return(
    <>
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
       <Route element={<MainLayout />}>
      <Route path="/" element={<Landing />} />
      <Route path="/charts" element={<Charts />} />
      <Route path="/holdings" element={<HoldingsPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/market" element={<MarketPage />} />
      <Route path="/crypto" element={<CryptoMarketPage />} />
      <Route path="/journal/:symbol?" element={<TradeJournalPage />} />
      <Route path="/ml-test" element={<MlTestPage />} />
      <Route path="/stock-ml" element={<StockMLPage />} />
      </Route>
    </Routes>
    </>
  )
}

export default App;
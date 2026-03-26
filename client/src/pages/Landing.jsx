import React from "react";
import Hero from "../components/Hero";
import MarketPreview from "../components/MarketPreview";
import Features from "../components/Features";
import Footer from "../components/Footer";
import TraderProfile from "../components/TradeProfile";
import CreateIdea from "../components/CreateIdea";
import Leaderboard from "../components/Leaderboard";


export default function Landing() {
  return(
    <>
    <Hero/>
    <MarketPreview/>
    <Features/>
    <TraderProfile/>
    <CreateIdea/>
    <Leaderboard/>
    <Footer/>
    </>
  )
}
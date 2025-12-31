"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import IntroScreen from "./IntroScreen";
import AssessmentFlow from "./AssessmentFlow";
import ResultScreen from "./ResultScreen";
import { calculatePlacement, PlacementResult } from "@/lib/calculatePlacementFlow";

type ViewState = "intro" | "assessment" | "result";

export default function AssessmentApp() {
  const [currentView, setCurrentView] = useState<ViewState>("intro");
  const [result, setResult] = useState<PlacementResult | null>(null);

  const handleStart = () => {
    setCurrentView("assessment");
  };

  const handleComplete = (answers: Record<number, number>) => {
    const placementResult = calculatePlacement(answers);
    setResult(placementResult);
    setCurrentView("result");
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <AnimatePresence mode="wait">
      {currentView === "intro" && (
        <motion.div
          key="intro"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4 }}
        >
          <IntroScreen onStart={handleStart} />
        </motion.div>
      )}

      {currentView === "assessment" && (
        <motion.div
          key="assessment"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4 }}
        >
          <AssessmentFlow onComplete={handleComplete} />
        </motion.div>
      )}

      {currentView === "result" && result && (
        <motion.div
          key="result"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4 }}
        >
          <ResultScreen result={result} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Music,
  Volume2,
  CheckCircle,
  XCircle,
  Loader,
  RotateCcw,
  Mic,
  Award,
  Lightbulb,
  Camera,
  Eye,
} from "lucide-react";

// Vision Analysis Interface
interface VisionAnalysis {
  objects: string[]
"use client";

import { motion } from "framer-motion";

interface LoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "dots" | "pulse" | "wave" | "brain" | "gradient" | "typing";
  color?: "teal" | "purple" | "pink" | "blue" | "white";
}

const sizeMap = {
  sm: { container: "gap-1", dot: "w-1.5 h-1.5", text: "text-xs" },
  md: { container: "gap-1.5", dot: "w-2 h-2", text: "text-sm" },
  lg: { container: "gap-2", dot: "w-3 h-3", text: "text-base" },
  xl: { container: "gap-3", dot: "w-4 h-4", text: "text-lg" },
};

const colorMap = {
  teal: { primary: "bg-teal-500", secondary: "bg-teal-300", gradient: "from-teal-400 to-emerald-500" },
  purple: { primary: "bg-purple-500", secondary: "bg-purple-300", gradient: "from-purple-400 to-pink-500" },
  pink: { primary: "bg-pink-500", secondary: "bg-pink-300", gradient: "from-pink-400 to-rose-500" },
  blue: { primary: "bg-blue-500", secondary: "bg-blue-300", gradient: "from-blue-400 to-cyan-500" },
  white: { primary: "bg-white", secondary: "bg-white/60", gradient: "from-white to-white/60" },
};

// Bouncing dots loader
function DotsLoader({ size = "md", color = "teal" }: LoaderProps) {
  const s = sizeMap[size];
  const c = colorMap[color];
  
  return (
    <div className={`flex items-center ${s.container}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`${s.dot} ${c.primary} rounded-full`}
          animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// Pulsing circle loader
function PulseLoader({ size = "md", color = "teal" }: LoaderProps) {
  const sizes = { sm: 24, md: 32, lg: 48, xl: 64 };
  const c = colorMap[color];
  
  return (
    <div className="relative" style={{ width: sizes[size], height: sizes[size] }}>
      <motion.div
        className={`absolute inset-0 ${c.primary} rounded-full`}
        animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className={`absolute inset-0 ${c.primary} rounded-full`}
        animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.2, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
      />
      <div className={`absolute inset-2 ${c.primary} rounded-full`} />
    </div>
  );
}

// Wave bars loader
function WaveLoader({ size = "md", color = "teal" }: LoaderProps) {
  const heights = { sm: 16, md: 24, lg: 32, xl: 40 };
  const widths = { sm: 3, md: 4, lg: 5, xl: 6 };
  const c = colorMap[color];
  
  return (
    <div className="flex items-end gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={`${c.primary} rounded-full`}
          style={{ width: widths[size], height: heights[size] }}
          animate={{ scaleY: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// Brain emoji loader (for L2-BRAIN theme)
function BrainLoader({ size = "md" }: LoaderProps) {
  const sizes = { sm: "text-2xl", md: "text-4xl", lg: "text-5xl", xl: "text-6xl" };
  
  return (
    <motion.div
      className={sizes[size]}
      animate={{ 
        scale: [1, 1.1, 1],
        rotate: [0, 5, -5, 0],
      }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
      🧠
    </motion.div>
  );
}

// Gradient spinner
function GradientLoader({ size = "md", color = "teal" }: LoaderProps) {
  const sizes = { sm: 24, md: 32, lg: 48, xl: 64 };
  const c = colorMap[color];
  
  return (
    <motion.div
      className={`rounded-full bg-gradient-to-r ${c.gradient}`}
      style={{ width: sizes[size], height: sizes[size], padding: 3 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <div className="w-full h-full bg-white dark:bg-gray-900 rounded-full" />
    </motion.div>
  );
}

// Typing indicator (chat style)
function TypingLoader({ color = "white" }: LoaderProps) {
  const c = colorMap[color];
  
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`w-2 h-2 ${c.secondary} rounded-full`}
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// Main export component
export function BeautifulLoader({ 
  message, 
  size = "md", 
  variant = "dots",
  color = "teal" 
}: LoaderProps) {
  const s = sizeMap[size];
  
  const renderLoader = () => {
    switch (variant) {
      case "pulse": return <PulseLoader size={size} color={color} />;
      case "wave": return <WaveLoader size={size} color={color} />;
      case "brain": return <BrainLoader size={size} />;
      case "gradient": return <GradientLoader size={size} color={color} />;
      case "typing": return <TypingLoader color={color} />;
      default: return <DotsLoader size={size} color={color} />;
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-3">
      {renderLoader()}
      {message && (
        <motion.p 
          className={`${s.text} text-gray-500 dark:text-gray-400`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

// Page loading skeleton
export function PageLoader({ message = "Đang tải..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <BrainLoader size="xl" />
      <motion.p 
        className="text-gray-500"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {message}
      </motion.p>
    </div>
  );
}

// Inline skeleton for content
export function SkeletonLoader({ className = "" }: { className?: string }) {
  return (
    <motion.div 
      className={`bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

// Success animation
export function SuccessAnimation({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: 32, md: 48, lg: 64 };
  const s = sizes[size];
  
  return (
    <motion.svg
      width={s}
      height={s}
      viewBox="0 0 50 50"
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="#10b981"
        strokeWidth="3"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { pathLength: 1, opacity: 1 }
        }}
        transition={{ duration: 0.5 }}
      />
      <motion.path
        d="M15 25 L22 32 L35 18"
        fill="none"
        stroke="#10b981"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { pathLength: 1, opacity: 1 }
        }}
        transition={{ duration: 0.3, delay: 0.4 }}
      />
    </motion.svg>
  );
}

// Export individual loaders for flexibility
export { DotsLoader, PulseLoader, WaveLoader, BrainLoader, GradientLoader, TypingLoader };

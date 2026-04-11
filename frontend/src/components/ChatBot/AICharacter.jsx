'use client';

import React from 'react';
import { motion } from 'framer-motion';

const AICharacter = ({ state = 'idle', size = 'md' }) => {
  const isMd = size === 'md';
  const width = isMd ? 120 : 60;
  const height = isMd ? 120 : 60;

  // Animation variants
  const bodyVariants = {
    idle: {
      y: [0, -4, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    talking: {
      y: [0, -6, 0],
      transition: {
        duration: 0.4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    listening: {
      rotate: [0, -2, 2, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const eyeVariants = {
    blink: {
      scaleY: [1, 1, 0.1, 1, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        times: [0, 0.8, 0.9, 1, 1],
        ease: "easeInOut"
      }
    }
  };

  const mouthVariants = {
    idle: { scaleX: 1, scaleY: 1 },
    talking: {
      scaleY: [1, 1.5, 0.8, 1.2, 1],
      transition: {
        duration: 0.3,
        repeat: Infinity,
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width, height }}>
      <motion.svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={state}
        variants={bodyVariants}
        className="w-full h-full drop-shadow-xl"
      >
        {/* Glow effect */}
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="botGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        {/* Body */}
        <rect x="20" y="30" width="60" height="50" rx="25" fill="url(#botGradient)" />
        <rect x="25" y="35" width="50" height="40" rx="20" fill="white" fillOpacity="0.1" />

        {/* Head area */}
        <circle cx="50" cy="40" r="25" fill="url(#botGradient)" />
        
        {/* Eyes Area */}
        <rect x="35" y="35" width="30" height="15" rx="7.5" fill="#1e1b4b" />
        
        {/* Left Eye */}
        <motion.circle
          cx="42"
          cy="42"
          r="3"
          fill="#4ade80"
          variants={eyeVariants}
          animate="blink"
          filter="url(#glow)"
        />
        
        {/* Right Eye */}
        <motion.circle
          cx="58"
          cy="42"
          r="3"
          fill="#4ade80"
          variants={eyeVariants}
          animate="blink"
          filter="url(#glow)"
        />

        {/* Mouth */}
        <motion.rect
          x="45"
          y="52"
          width="10"
          height="2"
          rx="1"
          fill="#4ade80"
          variants={mouthVariants}
          animate={state === 'talking' ? 'talking' : 'idle'}
        />

        {/* Antenna */}
        <line x1="50" y1="15" x2="50" y2="25" stroke="url(#botGradient)" strokeWidth="3" strokeLinecap="round" />
        <motion.circle
          cx="50"
          cy="12"
          r="4"
          fill="#f472b6"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          filter="url(#glow)"
        />
      </motion.svg>
    </div>
  );
};

export default AICharacter;

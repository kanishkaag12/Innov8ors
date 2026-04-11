'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AICharacter from './AICharacter';

const ChatButton = ({ onClick, isOpen }) => {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
        isOpen 
          ? 'bg-white text-indigo-600 rotate-90 scale-0 opacity-0 pointer-events-none' 
          : 'bg-gradient-to-br from-indigo-500 to-purple-600'
      }`}
    >
      <div className="relative">
        <AICharacter size="sm" state="idle" />
        
        {/* Pulsing ring */}
        {!isOpen && (
          <motion.div
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full border-2 border-indigo-400 -m-1"
          />
        )}
        
        {/* Notification dot */}
        <div className="absolute top-0 right-0 w-4 h-4 bg-pink-500 rounded-full border-2 border-white shadow-sm" />
      </div>
    </motion.button>
  );
};

export default ChatButton;

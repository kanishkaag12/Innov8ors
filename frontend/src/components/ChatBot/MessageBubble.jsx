'use client';

import React from 'react';
import { motion } from 'framer-motion';
import AICharacter from './AICharacter';

const MessageBubble = ({ message, isAI = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex w-full mb-4 ${isAI ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`flex max-w-[80%] ${isAI ? 'flex-row' : 'flex-row-reverse items-end'}`}>
        {isAI && (
          <div className="mr-2 mt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden shadow-lg border border-white/20">
              <AICharacter size="sm" state="idle" />
            </div>
          </div>
        )}
        
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm text-sm ${
            isAI
              ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
              : 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-tr-none'
          }`}
        >
          <p className="leading-relaxed whitespace-pre-wrap">{message}</p>
          <span className={`text-[10px] mt-1 block opacity-50 ${isAI ? 'text-slate-400' : 'text-indigo-100'}`}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;

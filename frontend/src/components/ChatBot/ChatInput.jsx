'use client';

import React, { useState } from 'react';
import { Send, Smile } from 'lucide-react';
import { motion } from 'framer-motion';

const ChatInput = ({ onSendMessage, disabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <div className="p-4 bg-white/50 backdrop-blur-md border-t border-slate-100">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            placeholder="Ask me anything..."
            className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all placeholder:text-slate-400"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors"
          >
            <Smile size={20} />
          </button>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!text.trim() || disabled}
          className={`h-11 w-11 flex items-center justify-center rounded-2xl transition-all ${
            text.trim() && !disabled
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-100'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Send size={18} />
        </motion.button>
      </form>
    </div>
  );
};

export default ChatInput;

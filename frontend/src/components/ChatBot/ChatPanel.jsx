'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Circle } from 'lucide-react';
import AICharacter from './AICharacter';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';

const ChatPanel = ({ 
  isOpen, 
  onClose, 
  messages, 
  onSendMessage, 
  isTalking, 
  isListening,
  soundEnabled,
  onToggleSound,
  suggestedPrompts
}) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9, x: 50 }}
          animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
          exit={{ opacity: 0, y: 100, scale: 0.9, x: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] flex flex-col bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                  <AICharacter size="sm" state={isTalking ? 'talking' : (isListening ? 'listening' : 'idle')} />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">SynapBot</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">Online</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={onToggleSound}
                  className="p-2 h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-indigo-100/90 leading-relaxed font-medium">
              Your AI guide for secure escrow & milestone management.
            </p>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-2 scroll-smooth bg-slate-50/50"
          >
            {messages.map((msg, idx) => (
              <MessageBubble 
                key={idx} 
                message={msg.text} 
                isAI={msg.isAI} 
              />
            ))}
            
            {isListening && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-slate-400 text-xs font-medium ml-10"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1 h-1 bg-indigo-400 rounded-full"
                    />
                  ))}
                </div>
                <span>SynapBot is thinking...</span>
              </motion.div>
            )}
          </div>

          {/* Suggested Prompts */}
          {messages.length < 3 && (
            <div className="px-6 py-3 flex flex-wrap gap-2 bg-slate-50/50">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <ChatInput onSendMessage={onSendMessage} disabled={isTalking} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatPanel;

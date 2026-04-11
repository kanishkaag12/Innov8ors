'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ChatButton from './ChatButton';
import ChatPanel from './ChatPanel';

const POP_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I’m your SynapBot assistant 😊 How can I help you today?" }
  ]);
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playSound = useCallback(() => {
    if (soundEnabled) {
      const audio = new Audio(POP_SOUND_URL);
      audio.volume = 0.4;
      audio.play().catch(e => console.log('Sound play blocked:', e));
    }
  }, [soundEnabled]);

  const speak = useCallback((text) => {
    if (!soundEnabled || !window.speechSynthesis) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1; // Slightly more 'robot' cute pitch
    
    utterance.onstart = () => setIsTalking(true);
    utterance.onend = () => setIsTalking(false);
    utterance.onerror = () => setIsTalking(false);

    window.speechSynthesis.speak(utterance);
  }, [soundEnabled]);

  const handleSendMessage = async (input) => {
    if (!input.trim()) return;

    // 1. Add User Message
    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    playSound();

    // 2. Start Loading State
    setIsListening(true);

    // Detect context
    let userRole = 'Guest';
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          userRole = parsed.role || 'User';
        } catch (e) {}
      }
    }
    const currentPage = typeof window !== 'undefined' ? window.location.pathname : 'unknown';

    try {
      // 3. API Call to Backend (Strictly port 5000)
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: input,
          history: messages,
          role: userRole,
          page: currentPage
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const aiReply = data.reply;

      // 4. Update UI with AI Response
      const botMessage = {
        role: "assistant",
        content: aiReply
      };

      setIsListening(false);
      setMessages(prev => [...prev, botMessage]);
      playSound();
      speak(aiReply);

    } catch (err) {
      console.error("❌ CHATBOT API ERROR:", err.message);
      setIsListening(false);
      
      const errorMessage = {
        role: "assistant",
        content: `I'm sorry, I'm having trouble connecting to my brain right now (${err.message}).`
      };
      setMessages(prev => [...prev, errorMessage]);
      speak(errorMessage.content);
    }
  };

  const suggestedPrompts = [
    "Post a project",
    "Find freelancers",
    "How does escrow work?",
    "Explain milestones"
  ];

  // Helper to map roles to Boolean for sub-components
  const formattedMessages = messages.map(msg => ({
    text: msg.content,
    isAI: msg.role === 'assistant'
  }));

  return (
    <>
      <ChatButton onClick={() => setIsOpen(true)} isOpen={isOpen} />
      <ChatPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        messages={formattedMessages}
        onSendMessage={handleSendMessage}
        isTalking={isTalking}
        isListening={isListening}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        suggestedPrompts={suggestedPrompts}
      />
    </>
  );
};

export default ChatBot;

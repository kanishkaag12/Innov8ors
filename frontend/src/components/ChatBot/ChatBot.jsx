'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatButton from './ChatButton';
import ChatPanel from './ChatPanel';

const POP_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I’m your SynapBot assistant 😊 How can I help you today?" }
  ]);
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const playSound = useCallback(() => {
    if (soundEnabledRef.current) {
      const audio = new Audio(POP_SOUND_URL);
      audio.volume = 0.4;
      audio.play().catch(e => console.log('Sound play blocked:', e));
    }
  }, []);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    
    // Stop any current speech queue before starting a new one
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1; // Slightly more 'robot' cute pitch
    
    utterance.onstart = () => {
      if (soundEnabledRef.current) {
        setIsTalking(true);
      }
    };
    utterance.onend = () => setIsTalking(false);
    utterance.onerror = () => setIsTalking(false);

    window.speechSynthesis.speak(utterance);

    // If muted, start it in paused state so it can be resumed later
    if (!soundEnabledRef.current) {
      window.speechSynthesis.pause();
    }
  }, []);

  // Sync ref and handle real-time mute/unmute (pause/resume)
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (!soundEnabled) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
        }
        setIsTalking(false);
      } else {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setIsTalking(true);
        } else if (!window.speechSynthesis.speaking) {
          // If not currently active or paused, but we have a last message, play it from start
          const lastMessage = messagesRef.current[messagesRef.current.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            speak(lastMessage.content);
          }
        }
      }
    }
  }, [soundEnabled, speak]);

  const handleSendMessage = async (input) => {
    if (!input.trim()) return;

    // 1. Add User Message
    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    playSound();

    // 2. Start Loading State
    setIsListening(true);

    // Detect context and retrieve token
    let userRole = 'Guest';
    let token = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('token');
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
      // 3. API Call to backend SynapBot route
      const headers = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/ai/synapbot/chat`, {
        method: "POST",
        headers,
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
      const aiReply = data.reply || "I am not sure based on the available SynapEscrow knowledge. Please contact support or rephrase your question.";

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
        content: `I am not sure right now due to a connection issue (${err.message}). Please try again or contact support.`
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

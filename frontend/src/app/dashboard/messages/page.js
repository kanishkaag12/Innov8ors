'use client';

import { useEffect, useState } from 'react';
import { Search, Send, FileText, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { fetchConversations, fetchConversation, sendConversationMessage, markConversationAsRead, fetchUnreadCount } from '@/services/api';
import { getStoredAuth } from '@/services/auth';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const [auth, setAuth] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);
  const requestedConversationId = searchParams.get('conversationId');

  useEffect(() => {
    const storedAuth = getStoredAuth();
    setAuth(storedAuth || null);
  }, []);

  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!auth?.token) return;
      try {
        const response = await fetchUnreadCount(auth.token);
        setTotalUnread(response.data.unreadCount || 0);
      } catch (err) {
        console.debug('Could not fetch unread count');
      }
    };
    loadUnreadCount();
  }, [auth]);

  useEffect(() => {
    const load = async () => {
      if (!auth?.token) {
        console.log('⚠️  No auth token available');
        return;
      }

      setLoading(true);
      setError('');
      try {
        console.log('📝 Fetching conversations for user:', auth.user?._id);
        const response = await fetchConversations(auth.token);
        console.log('✅ Conversations received:', response.data.conversations?.length || 0, 'conversations:', response.data.conversations);
        setConversations(response.data.conversations || []);
      } catch (err) {
        console.error('❌ Error fetching conversations:', err);
        setError('Unable to load conversations.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [auth]);

  useEffect(() => {
    if (!auth?.token) return;

    const pollInterval = setInterval(async () => {
      try {
        const conversationsResponse = await fetchConversations(auth.token);
        setConversations(conversationsResponse.data.conversations || []);

        const unreadResponse = await fetchUnreadCount(auth.token);
        setTotalUnread(unreadResponse.data.unreadCount || 0);

        if (selectedConversation?.id) {
          const messagesResponse = await fetchConversation(selectedConversation.id, auth.token);
          setMessages(messagesResponse.data.messages || []);
        }
      } catch (err) {
        console.debug('Poll update failed:', err.message);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [auth, selectedConversation]);

  const handleSelectConversation = async (conversation) => {
    if (!auth?.token || !conversation?.id) return;
    setSelectedConversation(conversation);
    setConversationLoading(true);
    setError('');

    try {
      const response = await fetchConversation(conversation.id, auth.token);
      setMessages(response.data.messages || []);

      if (conversation.unreadCount > 0) {
        await markConversationAsRead(conversation.id, auth.token);
        
        setConversations(prev => prev.map(conv => 
          conv.id === conversation.id 
            ? { ...conv, unreadCount: 0, hasUnread: false }
            : conv
        ));
        
        setTotalUnread(prev => Math.max(0, prev - conversation.unreadCount));
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load the conversation.');
    } finally {
      setConversationLoading(false);
    }
  };

  useEffect(() => {
    if (!auth?.token || !conversations.length) {
      return;
    }

    const selectedId = String(selectedConversation?.id || '');
    const requestedId = String(requestedConversationId || '');

    if (selectedId && conversations.some((conversation) => String(conversation.id) === selectedId)) {
      return;
    }

    if (requestedId) {
      const requestedConversation = conversations.find(
        (conversation) => String(conversation.id) === requestedId
      );

      if (requestedConversation) {
        handleSelectConversation(requestedConversation);
        return;
      }
    }

    if (!selectedId) {
      handleSelectConversation(conversations[0]);
    }
  }, [auth?.token, conversations, requestedConversationId]);

  const handleSendMessage = async () => {
    if (!auth?.token || !selectedConversation || !messageInput.trim()) {
      return;
    }

    try {
      const response = await sendConversationMessage(selectedConversation.id, { text: messageInput.trim() }, auth.token);
      setMessages((prev) => [...prev, response.data.message]);
      setMessageInput('');

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? { ...conversation, lastMessage: response.data.message.text, lastMessageAt: response.data.message.createdAt }
            : conversation
        )
      );
    } catch (err) {
      console.error(err);
      setError('Unable to send the message.');
    }
  };

  const userId = auth?.user?._id || auth?.user?.id;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col sm:flex-row gap-6 animate-in fade-in duration-500">
      <div className="w-full sm:w-80 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Messages
              {totalUnread > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </h2>
            <Link href="/dashboard/freelancer" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
              Back
            </Link>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 bg-white text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow"
              disabled
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Loading conversations...</div>
          ) : conversations.length ? (
            conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => handleSelectConversation(conv)}
                className={`w-full p-4 text-left transition ${selectedConversation?.id === conv.id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex gap-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-sm">
                    {(conv.otherParticipantName || conv.projectTitle)?.charAt(0) || 'C'}
                    {conv.hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm ${conv.hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {conv.otherParticipantName || conv.projectTitle}
                      </p>
                      <p className="text-[11px] text-slate-400">{new Date(conv.lastMessageAt).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className={`truncate text-xs ${conv.hasUnread ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                        {conv.lastMessage}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold text-white shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-sm text-slate-500">
              No conversations yet. Your chat will appear here once your proposal is accepted.
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between shadow-sm z-10 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 leading-tight text-base">
              {selectedConversation ? `${selectedConversation.projectTitle} (${selectedConversation.otherParticipantName})` : 'Select a conversation'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedConversation
                ? `Project chat with ${selectedConversation.otherParticipantName}`
                : 'Chat opens after an accepted proposal creates a conversation.'}
            </p>
          </div>
          {selectedConversation && (
            <button className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-xl transition border border-emerald-100 shadow-sm">
              View Contract
            </button>
          )}
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-[#efeae2] bg-gradient-to-b from-[#efeae2] to-[#e5ddd5] space-y-4 relative">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">{error}</div>
          ) : null}

          {conversationLoading ? (
            <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full w-max mx-auto shadow-sm">Loading conversation...</div>
          ) : selectedConversation ? (
            messages.length ? (
              messages.map((message) => {
                const isSender = String(message.sender?.id) === String(userId);
                return (
                  <div
                    key={message.id}
                    className={`flex ${isSender ? 'justify-end' : 'justify-start'} w-full animate-in fade-in slide-in-from-bottom-2 duration-200`}
                  >
                    <div 
                      className={`max-w-[75%] rounded-[1rem] px-3.5 py-2 text-[13.5px] leading-relaxed shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative ${
                        isSender 
                          ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none' 
                          : 'bg-white text-[#111b21] rounded-tl-none'
                      }`}
                    >
                      {!isSender && (
                        <p className="text-[11px] font-extrabold text-emerald-600 mb-0.5 tracking-wide">
                          {message.sender?.name}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap pr-12 pb-1.5">{message.text}</p>
                      <div className="absolute bottom-1 right-2.5 flex items-center gap-1 text-[10px] text-[#667781] select-none font-medium">
                        <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        {isSender && (
                          <CheckCheck size={14} className={message.isRead ? 'text-[#53bdeb]' : 'text-[#8696a0]'} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 text-center max-w-sm mx-auto shadow-sm">
                No messages yet. Send the first message to start this conversation.
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center text-center text-slate-500">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-100 max-w-sm shadow-sm">
                <p className="text-lg font-bold text-slate-900">No conversation selected</p>
                <p className="mt-2 text-sm text-slate-600">Choose a conversation on the left or accept a proposal to begin chatting.</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="relative flex items-center">
            <input
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              type="text"
              placeholder={selectedConversation ? 'Type your message...' : 'Select a conversation first.'}
              disabled={!selectedConversation}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow disabled:cursor-not-allowed disabled:opacity-70"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!selectedConversation || !messageInput.trim()}
              className="absolute right-2 h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm disabled:bg-slate-300 disabled:text-slate-500"
            >
              <Send size={14} className="-ml-0.5 mt-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

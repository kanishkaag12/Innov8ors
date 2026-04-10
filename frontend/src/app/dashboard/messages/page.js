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
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-sm">
                    {conv.projectTitle?.charAt(0) || 'C'}
                    {conv.hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm ${conv.hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {conv.projectTitle}
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
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 leading-tight">
              {selectedConversation ? selectedConversation.projectTitle : 'Select a conversation'}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedConversation
                ? `Project chat for ${selectedConversation.projectTitle}`
                : 'Chat opens after an accepted proposal creates a conversation.'}
            </p>
          </div>
          {selectedConversation && (
            <button className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition">
              View Contract
            </button>
          )}
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-6">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : null}

          {conversationLoading ? (
            <div className="text-sm text-slate-500">Loading conversation...</div>
          ) : selectedConversation ? (
            messages.length ? (
              messages.map((message) => {
                const isSender = String(message.sender?.id) === String(userId);
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isSender ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isSender && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs font-bold">
                        {message.sender?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-3xl p-4 text-sm shadow-sm ${isSender ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white text-slate-800 rounded-bl-sm'}`}>
                      <p>{message.text}</p>
                      <div className={`mt-2 flex items-center gap-1 text-[11px] ${isSender ? 'text-emerald-100' : 'text-slate-400'}`}>
                        <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isSender && message.isRead && (
                          <CheckCheck size={12} className="ml-1 text-emerald-200" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                No messages yet. Send the first message to start this conversation.
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center text-center text-slate-500">
              <div>
                <p className="text-lg font-semibold">No conversation selected</p>
                <p className="mt-2 text-sm">Choose a conversation on the left or accept a proposal to begin chatting.</p>
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

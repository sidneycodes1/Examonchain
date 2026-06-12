'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { Material } from '@/types/database';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAreaProps {
  selectedMaterial?: Material | null;
}

const suggestions = [
  { label: '📝 Summarize material', prompt: 'Please provide a comprehensive summary of this study material, highlighting the main ideas and core takeaways.' },
  { label: '💡 Key concepts', prompt: 'List the most important key concepts and terms from this material, along with brief explanations for each.' },
  { label: '❓ Practice questions', prompt: 'Generate 3 practice questions based on this study material to help test my understanding.' },
  { label: '🔍 Explain main topic', prompt: 'What is the central topic of this material? Explain it in simple terms.' },
];

export default function ChatArea({ selectedMaterial = null }: ChatAreaProps) {
  const { getAccessToken, logout } = usePrivy();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clear messages when user switches material
  useEffect(() => {
    setMessages([]);
  }, [selectedMaterial?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!selectedMaterial || !textToSend.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          materialId: selectedMaterial.id,
          message: textToSend,
          history: messages,
        }),
      });

      if (res.status === 401) {
        logout();
        router.push('/login');
        return;
      }

      const data = await res.json() as { success: boolean; reply?: string; error?: string };

      if (data.success && data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || '' }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Sorry, I encountered an error: ${data.error || 'Unknown error'}` },
        ]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I failed to reach the AI study assistant. Please check your network connection.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    handleSendMessage(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // If no material is selected
  if (!selectedMaterial) {
    return (
      <div className="flex-1 bg-[#0D0D0D] p-6 flex flex-col items-center justify-center gap-4 h-[calc(100vh-4rem)] border-r border-[#2A2A2A]">
        <svg className="w-12 h-12 text-[#A0A0A0]/50 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-[#A0A0A0] text-sm text-center">
          Upload or select a study material from the sidebar to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0D0D0D] p-6 flex flex-col justify-between h-[calc(100vh-4rem)] border-r border-[#2A2A2A] relative">
      {/* Title */}
      <div className="border-b border-[#2A2A2A] pb-3 mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-md font-bold text-[#F5F5F7]">Chat Assistant</h2>
          <p className="text-[10px] text-[#00C896] font-semibold mt-0.5 truncate max-w-xs md:max-w-md">
            Context: {selectedMaterial.title}
          </p>
        </div>
      </div>

      {/* Messages / Suggestions Area */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 py-4 min-h-0">
        {messages.length === 0 ? (
          /* Suggestions display when empty */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-md mx-auto w-full">
            <div className="text-center">
              <h3 className="text-sm font-bold text-[#F5F5F7] mb-1">
                Ask anything about this material
              </h3>
              <p className="text-xs text-[#A0A0A0]">
                Select a quick suggestion below to start learning
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(sug.prompt)}
                  className="p-3 text-left rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]/40 text-xs text-[#F5F5F7] hover:border-[#00C896]/50 hover:bg-[#1A1A1A]/80 transition-all duration-200 active:scale-[0.98]"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages list */
          <div className="flex flex-col gap-3">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#00C896]/10 border border-[#00C896]/20 text-[#00C896]'
                        : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F7]'
                    } whitespace-pre-wrap`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {/* Typing Loader */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Spinner size="small" />
                  <span className="text-[10px] text-[#A0A0A0] animate-pulse">
                    AI is processing...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex gap-2 items-end border-t border-[#2A2A2A] pt-4 mt-2">
        <textarea
          placeholder="Ask a question about this material..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={loading}
          className="flex-1 p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-xs text-[#F5F5F7] placeholder-[#A0A0A0] focus:outline-none focus:border-[#00C896] resize-none h-12 max-h-24"
        />
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="h-12 w-12 flex items-center justify-center flex-shrink-0 rounded-xl"
          aria-label="Send message"
        >
          <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
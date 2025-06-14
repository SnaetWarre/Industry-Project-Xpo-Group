'use client';

import { useEffect, useState } from 'react';
import { getChatHistory } from '@/lib/services/chatgeschiedenis/chatHistoryService';
import { ChevronLeft, MessageSquare } from 'lucide-react';

interface ChatMessage {
  timestamp: string;
  message: string;
  isUser: boolean;
}

interface ChatDetailProps {
  sessionId: string;
  onBack: () => void;
}

const ChatDetail = ({ sessionId, onBack }: ChatDetailProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const chatHistory = await getChatHistory(sessionId);
        setMessages(chatHistory);
      } catch (err) {
        setError('Er is een fout opgetreden bij het ophalen van de chatgeschiedenis.');
        console.error(err);
      } finally {
        setLoading(false);
        setMounted(true);
      }
    };

    fetchChatHistory();
  }, [sessionId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-neutral-150 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center">
            <button 
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="ml-6">
              <h1 className="text-lg font-semibold text-black">Chat Details</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">Session ID: {sessionId}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Chat Messages */}
        <div className="max-w-7xl mx-auto px-6 py-4 min-h-[60vh] flex items-center justify-center">
          <span className="text-black/50">Bericht wordt geladen...</span>
        </div>
      </div>
    );
  }
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-neutral-150 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center">
          <button 
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="ml-6">
            <h1 className="text-lg font-semibold text-black">Chat Details</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">Session ID: {sessionId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-7xl mx-auto px-6 py-4 min-h-[60vh]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full h-96">
            <MessageSquare className="w-14 h-14 text-gray-300 mb-4" />
            <span className="text-gray-500 text-lg">Geen chatgeschiedenis gevonden</span>
          </div>
        ) : (
          <div className="space-y-6 w-full">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl rounded-lg p-4 ${
                  message.isUser 
                    ? 'bg-red-10 text-white' 
                    : 'bg-black/3 text-black'
                }`}>
                  <p className="text-sm">{message.message}</p>
                  <p className={`text-xs mt-2 ${message.isUser ? 'text-white/80' : 'text-neutral-500'}`}>
                    {mounted ? new Date(message.timestamp).toLocaleString('nl-BE') : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatDetail; 
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useChatbot } from "@/hooks/useChatbot";
import { ChatMessage } from "@/components/chatbot/ChatMessage";
import { ChatInput } from "@/components/chatbot/ChatInput";
import { SuggestionChips } from "@/components/chatbot/SuggestionChips";
import type { ChatQueryType, SuggestedPrompt, ChatActionConfirm } from "@/lib/types";

export default function ChatbotPage() {
  const router = useRouter();
  const { activePatient } = usePatient();
  const {
    messages, suggestions, loading, status, error,
    fetchSuggestions, sendQuery, confirmAction, dismissAction, clearMessages,
  } = useChatbot();

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activePatient) fetchSuggestions(activePatient.id);
  }, [activePatient?.id, fetchSuggestions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback((query: string, queryType?: ChatQueryType) => {
    if (!activePatient) return;
    sendQuery(activePatient.id, query, queryType);
  }, [activePatient?.id, sendQuery]);

  const handleSuggestion = useCallback((prompt: SuggestedPrompt) => {
    if (!activePatient) return;
    sendQuery(activePatient.id, prompt.text, prompt.query_type);
  }, [activePatient?.id, sendQuery]);

  const handleConfirmAction = useCallback(async (msgId: string) => {
    if (!activePatient) return;
    const msg = messages.find(m => m.id === msgId);
    const firstAction = msg?.proposed_actions?.[0];
    if (!firstAction) return;
    const action: ChatActionConfirm = {
      action_type: firstAction.action_type,
      payload: firstAction.payload,
    };
    const res = await confirmAction(activePatient.id, action, msgId);
    if (res?.redirect_url) {
      router.push(res.redirect_url);
    }
  }, [activePatient?.id, messages, confirmAction, router]);

  const handleDismissAction = useCallback((msgId: string) => {
    dismissAction(msgId);
  }, [dismissAction]);

  if (!activePatient) {
    return <p className="text-[var(--color-muted)] text-sm">No patient selected.</p>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 shrink-0 px-1">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">AI Health Assistant</h1>
        <p className="text-sm text-[#6B7280] mt-1">Ask about medications, labs, symptoms, or history</p>
      </div>

      {/* Main Container */}
      <div className="flex-1 bg-white rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[#E5E7EB] flex flex-col overflow-hidden relative">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F3F4F6] flex items-center justify-center text-3xl">
                👋
              </div>
              <div>
                <p className="text-lg font-semibold text-[#1F2937]">Hi! I'm your CareCircle assistant.</p>
                <p className="text-sm text-[#6B7280] mt-1">How can I help you with {activePatient.name}'s care today?</p>
              </div>
              <SuggestionChips suggestions={suggestions} onSelect={handleSuggestion} disabled={loading} />
            </div>
          )}

          {messages.map(msg => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onConfirmAction={handleConfirmAction}
              onDismissAction={handleDismissAction}
              actionLoading={loading}
            />
          ))}

          {loading && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-start">
                <div className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
              {status && (
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[#9CA3AF] px-1 animate-pulse">
                  {status}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-xs text-center text-red-500 font-medium py-2">{error}</p>}

          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips (after first message) */}
        {messages.length > 0 && suggestions.length > 0 && (
          <div className="px-6 py-4 bg-white border-t border-[#F3F4F6]">
            <SuggestionChips suggestions={suggestions} onSelect={handleSuggestion} disabled={loading} />
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white border-t border-[#F3F4F6]">
          <ChatInput 
            onSend={handleSend} 
            disabled={loading} 
            placeholder={`Ask anything about ${activePatient.name.split(' ')[0]}'s health...`} 
          />
        </div>

        {/* Clear button - Floating absolute */}
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
            title="Clear chat"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

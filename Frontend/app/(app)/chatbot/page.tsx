"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useAuth } from "@/hooks/useAuth";
import { useChatbot } from "@/hooks/useChatbot";
import { ChatMessage } from "@/components/chatbot/ChatMessage";
import { ChatInput } from "@/components/chatbot/ChatInput";
import { SuggestionChips } from "@/components/chatbot/SuggestionChips";
import type { ChatQueryType, SuggestedPrompt, ChatActionConfirm } from "@/lib/types";

export default function ChatbotPage() {
  const router = useRouter();
  const { activePatient } = usePatient();
  const { user } = useAuth();
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

  const userInitials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "Me";

  if (!activePatient) {
    return <p className="text-[var(--color-muted)] text-sm">No patient selected.</p>;
  }

  return (
    <>
      {/* Mobile: fixed layer pinned between topbar (h-14=56px) and bottom nav (h-16=64px) */}
      <div className="fixed inset-x-0 top-14 bottom-16 flex flex-col px-4 pt-4 lg:hidden"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

        {/* Header */}
        <div className="mb-3 shrink-0 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-primary)]">Health Assistant</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Ask about medications, labs, symptoms, or history</p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearMessages} className="p-2 rounded-xl text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-all">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
              <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center text-2xl shadow-sm">👋</div>
              <div>
                <p className="text-lg font-bold text-[#1F2937]">Hi! I&apos;m your CareCircle assistant.</p>
                <p className="text-sm text-[#6B7280] mt-1">How can I help with {activePatient.name}&apos;s care today?</p>
              </div>
              <SuggestionChips suggestions={suggestions} onSelect={handleSuggestion} disabled={loading} />
            </div>
          )}
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} onConfirmAction={handleConfirmAction}
              onDismissAction={handleDismissAction} actionLoading={loading} userInitials={userInitials} />
          ))}
          {loading && (
            <div className="flex items-end gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0D3B6E] flex items-center justify-center text-[10px] font-black text-white shrink-0">CC</div>
              <div className="flex flex-col gap-1">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center shadow-sm">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
                {status && <p className="text-[10px] uppercase tracking-wider font-semibold text-[#9CA3AF] px-1 animate-pulse">{status}</p>}
              </div>
            </div>
          )}
          {error && <p className="text-xs text-center text-red-500 font-medium py-2">{error}</p>}
          <div ref={bottomRef} />
        </div>

        {/* Chips above input */}
        {messages.length > 0 && suggestions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 shrink-0">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSuggestion(s)} disabled={loading}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-[#10B981] border border-[#10B981] hover:bg-[#10B981] hover:text-white transition-all disabled:opacity-50 whitespace-nowrap shrink-0 shadow-sm active:scale-95">
                {s.text}
              </button>
            ))}
          </div>
        )}

        {/* Input pinned at bottom */}
        <div className="shrink-0 pb-2">
          <ChatInput onSend={handleSend} disabled={loading} placeholder="Ask anything..." />
        </div>
      </div>

      {/* Desktop: normal flow */}
      <div className="hidden lg:flex flex-col h-[calc(100vh-8rem)] max-w-6xl mx-auto">
        <div className="mb-4 shrink-0 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-primary)]">Health Assistant</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Ask about medications, labs, symptoms, or history</p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearMessages} className="p-2 rounded-xl text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-all mt-1">
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
              <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center text-2xl shadow-sm">👋</div>
              <div>
                <p className="text-lg font-bold text-[#1F2937]">Hi! I&apos;m your CareCircle assistant.</p>
                <p className="text-sm text-[#6B7280] mt-1">How can I help with {activePatient.name}&apos;s care today?</p>
              </div>
              <SuggestionChips suggestions={suggestions} onSelect={handleSuggestion} disabled={loading} />
            </div>
          )}
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} onConfirmAction={handleConfirmAction}
              onDismissAction={handleDismissAction} actionLoading={loading} userInitials={userInitials} />
          ))}
          {loading && (
            <div className="flex items-end gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0D3B6E] flex items-center justify-center text-[10px] font-black text-white shrink-0">CC</div>
              <div className="flex flex-col gap-1">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center shadow-sm">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
                {status && <p className="text-[10px] uppercase tracking-wider font-semibold text-[#9CA3AF] px-1 animate-pulse">{status}</p>}
              </div>
            </div>
          )}
          {error && <p className="text-xs text-center text-red-500 font-medium py-2">{error}</p>}
          <div ref={bottomRef} />
        </div>
        {messages.length > 0 && suggestions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3 shrink-0">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSuggestion(s)} disabled={loading}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-[#10B981] border border-[#10B981] hover:bg-[#10B981] hover:text-white transition-all disabled:opacity-50 whitespace-nowrap shrink-0 shadow-sm active:scale-95">
                {s.text}
              </button>
            ))}
          </div>
        )}
        <div className="shrink-0 pt-2">
          <ChatInput onSend={handleSend} disabled={loading} placeholder="Ask anything..." />
        </div>
      </div>
    </>
  );
}

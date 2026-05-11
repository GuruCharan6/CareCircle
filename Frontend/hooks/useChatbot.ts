"use client";

import { useState, useCallback, useRef } from "react";
import { chatbotApi } from "@/lib/api/chatbot";
import type { ChatResponse, ChatQueryType, ChatActionConfirm, SuggestedPrompt } from "@/lib/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  query_type?: ChatQueryType;
  sources?: string[];
  proposed_actions?: ChatResponse["proposed_actions"];
  processing_steps?: string[];
  created_at?: string;
}

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (patientId: string) => {
    try {
      const data = await chatbotApi.suggestedPrompts(patientId);
      setSuggestions(data);
    } catch {
      // non-critical
    }
  }, []);

  const sendQuery = useCallback(async (
    patientId: string,
    query: string,
    queryType?: ChatQueryType
  ) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: query,
      created_at: new Date().toISOString(),
    };
    // Use ref to get current messages (avoids stale closure)
    const currentMessages = messagesRef.current;
    messagesRef.current = [...currentMessages, userMsg];
    setMessages(messagesRef.current);
    setLoading(true);
    setError(null);

    // Keyword-smart initial status based on likely tool
    const q = query.toLowerCase();
    const initialStatus =
      q.includes("medication") || q.includes(" med ") || q.includes("prescription") || q.includes("drug") || q.includes("tablet")
        ? "Fetching medications..."
        : q.includes("lab") || q.includes("test") || q.includes("result") || q.includes("hba1c") || q.includes("blood sugar") || q.includes("report")
        ? "Fetching lab results..."
        : q.includes("appointment") || q.includes("schedule") || q.includes("calendar") || q.includes("visit") || q.includes("book")
        ? "Checking appointments..."
        : q.includes("doctor") || q.includes("note") || q.includes("said") || q.includes("history") || q.includes("diagnosis")
        ? "Searching medical records..."
        : "Consulting Gemini...";
    setStatus(initialStatus);

    const statusTimeout2 = setTimeout(() => {
      setStatus("Synthesizing answer...");
    }, 2500);

    try {
      const history = currentMessages.map(m => ({
        role: m.role,
        content: m.content
      }));
      const res = await chatbotApi.query(patientId, { 
        query, 
        query_type: queryType,
        history,
        local_time: new Date().toISOString()
      });
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        query_type: res.query_type,
        sources: res.sources,
        proposed_actions: res.proposed_actions,
        processing_steps: res.processing_steps,
        created_at: new Date().toISOString(),
      };
      messagesRef.current = [...messagesRef.current, assistantMsg];
      setMessages(messagesRef.current);
      // Update inline suggestions from response
      if (res.suggested_prompts.length) {
        setSuggestions(res.suggested_prompts);
      }
      return res;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Query failed");
      return null;
    } finally {
      clearTimeout(statusTimeout2);
      setLoading(false);
      setStatus(null);
    }
  }, []);

  const confirmAction = useCallback(async (
    patientId: string,
    action: ChatActionConfirm,
    triggerMsgId: string
  ) => {
    setLoading(true);
    setStatus("Executing action...");
    setError(null);
    try {
      const res = await chatbotApi.confirmAction(patientId, action);
      const updated = messagesRef.current
        .map(m => m.id === triggerMsgId ? { ...m, proposed_actions: undefined } : m)
        .concat({
          id: `a-${Date.now()}`,
          role: "assistant" as const,
          content: res.answer,
          query_type: res.query_type,
          sources: res.sources,
          created_at: new Date().toISOString(),
        });
      messagesRef.current = updated;
      setMessages(updated);
      return res;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action confirm failed");
      return null;
    } finally {
      setLoading(false);
      setStatus(null);
    }
  }, []);

  const dismissAction = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, proposed_actions: undefined } : m
    ));
  }, []);

  const clearMessages = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
  }, []);

  return { messages, suggestions, loading, status, error, fetchSuggestions, sendQuery, confirmAction, dismissAction, clearMessages };
}

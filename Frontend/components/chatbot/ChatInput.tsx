"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatQueryType } from "@/lib/types";

interface Props {
  onSend: (query: string, queryType?: ChatQueryType) => void;
  disabled?: boolean;
  placeholder?: string;
}

const QUERY_TYPES: { value: ChatQueryType; label: string }[] = [
  { value: "hybrid",   label: "Auto" },
  { value: "sql",      label: "SQL" },
  { value: "semantic", label: "Semantic" },
];

export function ChatInput({ onSend, disabled, placeholder = "Ask anything about the patient's health..." }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, "hybrid");
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div className="flex items-end gap-2.5">
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 resize-none rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm focus:outline-none focus:border-[#0D3B6E] transition-all disabled:opacity-50 max-h-[120px] overflow-y-auto bg-white"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="w-11 h-11 rounded-full bg-[#0D3B6E] text-white flex items-center justify-center hover:bg-[#1a4f8a] transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-md"
      >
        <ArrowUp size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}

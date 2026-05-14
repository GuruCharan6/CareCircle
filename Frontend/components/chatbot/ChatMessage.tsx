"use client";

import { RouteTag } from "./RouteTag";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/hooks/useChatbot";

interface Props {
  message: ChatMessageType;
  onConfirmAction?: (msgId: string) => void;
  onDismissAction?: (msgId: string) => void;
  actionLoading?: boolean;
  userInitials?: string;
}

export function ChatMessage({ message, onConfirmAction, onDismissAction, actionLoading, userInitials = "Me" }: Props) {
  const isUser = message.role === "user";
  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "Just now";

  return (
    <div className={cn("flex items-end gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mb-5",
        isUser ? "bg-[#0D3B6E] text-white" : "bg-[#0D3B6E] text-white"
      )}>
        {isUser ? userInitials : "CC"}
      </div>

      {/* Bubble + timestamp */}
      <div className={cn("flex flex-col gap-1 max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
            isUser
              ? "bg-[#0D3B6E] text-white rounded-br-sm"
              : "bg-white text-[#374151] border border-[#E5E7EB] rounded-bl-sm"
          )}
        >
          {/* Content */}
          <div className="whitespace-pre-wrap prose prose-sm max-w-none prose-p:leading-relaxed">
            {message.content}
          </div>

          {/* Assistant meta */}
          {!isUser && (
            <div className="mt-3 flex items-center gap-2 flex-wrap border-t border-[#F3F4F6] pt-3">
              {message.query_type && <RouteTag queryType={message.query_type} />}
              {message.sources && message.sources.length > 0 && (
                <span className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-wider">
                  {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Proposed actions */}
          {message.proposed_actions && message.proposed_actions.map((action, idx) => (
            <div key={idx} className="mt-4 p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg shadow-sm border border-[#F3F4F6]">
                  {action.action_type === 'add_calendar_event' || action.action_type === 'schedule_caregiver_visit' ? '📅' : '📂'}
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-[#111827]">
                    {action.action_type === 'add_calendar_event' ? 'Add to Calendar' :
                     action.action_type === 'schedule_caregiver_visit' ? 'Schedule Visit' :
                     action.action_type === 'upload_trigger' ? 'Upload Document' : 'Action Needed'}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {action.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 rounded-lg bg-[#10B981] hover:bg-[#059669] border-none"
                  loading={actionLoading}
                  onClick={() => onConfirmAction?.(message.id)}
                >
                  Confirm Action
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-lg"
                  disabled={actionLoading}
                  onClick={() => onDismissAction?.(message.id)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
        <span className="text-[10px] font-medium text-[#9CA3AF] px-1 uppercase tracking-tighter">
          {time}
        </span>
      </div>
    </div>
  );
}

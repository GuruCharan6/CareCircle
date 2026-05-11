"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Edit3, Trash2 } from "lucide-react";
import { cn, formatDateLocal } from "@/lib/utils";
import type { CalendarEventResponse } from "@/lib/types";

interface MiniCalendarProps {
  events: CalendarEventResponse[];
  onDateClick: (date: Date) => void;
  isEditMode?: boolean;
  onEditEvent?: (event: CalendarEventResponse) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export function MiniCalendar({ 
  events, 
  onDateClick, 
  isEditMode = false,
  onEditEvent,
  onDeleteEvent
}: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));

  const monthName = currentDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const todayStr = formatDateLocal(new Date());

  const typeColors: Record<string, string> = {
    appointment: "bg-blue-400",
    lab_test: "bg-yellow-400",
    caregiver: "bg-gray-400"
  };

  const getDayEvents = (date: Date) => {
    const dStr = formatDateLocal(date);
    return events.filter(e => e.event_date === dStr && e.status !== "cancelled");
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] font-bold text-[var(--color-text)] uppercase tracking-wider">{monthName}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-[var(--color-border)] rounded transition-colors">
            <ChevronLeft size={12} />
          </button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-[var(--color-border)] rounded transition-colors">
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="text-[8px] font-bold text-[var(--color-muted)] text-center pb-1">
            {d}
          </div>
        ))}
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
          
          const isToday = formatDateLocal(date) === todayStr;
          const dayEvents = getDayEvents(date);
          const eventTypes = Array.from(new Set(dayEvents.map(e => e.event_type)));
          
          return (
            <div 
              key={date.getTime()}
              onClick={() => onDateClick(date)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-md cursor-pointer transition-all relative group",
                isToday ? "bg-[var(--color-action)] text-white" : "hover:bg-[var(--color-action)]/10 text-[var(--color-text)]"
              )}
            >
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                !isToday && "group-hover:text-[var(--color-action)]"
              )}>{date.getDate()}</span>
              
              {/* Event Dots */}
              {eventTypes.length > 0 && !isEditMode && (
                <div className="flex gap-0.5 mt-0.5">
                  {eventTypes.map(type => (
                    <div 
                      key={type} 
                      className={cn(
                        "w-1 h-1 rounded-full",
                        type === "appointment" ? "bg-[var(--color-action)]" :
                        type === "lab_test" ? "bg-[var(--color-watch)]" :
                        "bg-[var(--color-text)]",
                        isToday && "bg-white"
                      )} 
                    />
                  ))}
                </div>
              )}

              {isEditMode && dayEvents.length > 0 && (
                <div className="absolute inset-0 bg-[var(--color-surface)]/90 rounded-md flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditEvent?.(dayEvents[0]); }}
                    className="p-0.5 hover:text-[var(--color-action)] text-[var(--color-text)]"
                  >
                    <Edit3 size={10} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteEvent?.(dayEvents[0].id); }}
                    className="p-0.5 hover:text-[var(--color-alert)] text-[var(--color-text)]"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex flex-wrap gap-x-4 gap-y-1 justify-center">
        <LegendItem color="bg-[var(--color-action)]" label="Appointment" />
        <LegendItem color="bg-[var(--color-watch)]" label="Lab Test" />
        <LegendItem color="bg-[var(--color-text)]" label="Caregiver" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-1.5 h-1.5 rounded-full", color)} />
      <span className="text-[9px] font-bold text-[var(--color-muted)] uppercase tracking-tight">{label}</span>
    </div>
  );
}

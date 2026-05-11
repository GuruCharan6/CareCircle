"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit3 } from "lucide-react";
import { cn, formatDateLocal } from "@/lib/utils";
import type { CalendarEventResponse } from "@/lib/types";

interface CalendarMonthGridProps {
  events: CalendarEventResponse[];
  onEventClick: (event: CalendarEventResponse) => void;
  onAddClick: (date: Date) => void;
  isEditMode?: boolean;
  onEditEvent?: (event: CalendarEventResponse) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export function CalendarMonthGrid({ 
  events, 
  onEventClick, 
  onAddClick, 
  isEditMode = false,
  onEditEvent,
  onDeleteEvent
}: CalendarMonthGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const startDay = firstDayOfMonth.getDay(); // 0 = Sunday
  const totalDays = lastDayOfMonth.getDate();

  const days = [];
  
  // Padding for previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false });
  }
  
  // Days of current month
  for (let i = 1; i <= totalDays; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  // Padding for next month
  const remainingDays = 42 - days.length; // Always show 6 rows
  for (let i = 1; i <= remainingDays; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  const monthName = currentDate.toLocaleDateString("en-IN", { month: "long" });
  const yearName = currentDate.getFullYear();

  const getEventsForDay = (date: Date) => {
    const dStr = formatDateLocal(date);
    return events.filter(e => e.event_date === dStr);
  };

  const todayStr = formatDateLocal(new Date());

  return (
    <div className="bg-white rounded-[24px] border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-[#F3F4F6] flex items-center justify-between bg-[#FDFDFD]">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-[#1F2937]">
            {monthName} <span className="font-medium text-[#9CA3AF] ml-1">{yearName}</span>
          </h3>
          <button 
            onClick={goToToday}
            className="px-3 py-1 text-[10px] font-bold text-[#0D3B6E] bg-[#0D3B6E]/5 hover:bg-[#0D3B6E]/10 rounded-full transition-all"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={prevMonth}
            className="p-1.5 hover:bg-[#F3F4F6] rounded-xl transition-colors text-[#6B7280]"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={nextMonth}
            className="p-1.5 hover:bg-[#F3F4F6] rounded-xl transition-colors text-[#6B7280]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 border-b border-[#F3F4F6] bg-white">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-[#F3F4F6] border-l border-t border-transparent flex-1">
        {days.map(({ date, isCurrentMonth }, i) => {
          const dayEvents = getEventsForDay(date);
          const isToday = formatDateLocal(date) === todayStr;
          
          return (
            <div 
              key={date.getTime()} 
              onClick={() => onAddClick(date)}
              className={cn(
                "h-[calc((100vh-320px)/6)] min-h-[95px] p-1.5 group relative flex flex-col transition-all cursor-pointer",
                isCurrentMonth ? "bg-white hover:bg-[#F9FAFB]" : "bg-[#FBFBFB] opacity-40",
                !isCurrentMonth && "pointer-events-none"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                  isToday 
                    ? "bg-[#0D3B6E] text-white shadow-md scale-110" 
                    : isCurrentMonth ? "text-[#374151] group-hover:text-[#0D3B6E]" : "text-[#9CA3AF]"
                )}>
                  {date.getDate()}
                </span>
                {isCurrentMonth && (
                  <div className="opacity-0 group-hover:opacity-100 p-1 text-[#0D3B6E] transition-all">
                    <Plus size={14} />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto scrollbar-hide">
                {dayEvents.map(event => (
                  <div 
                    key={event.id}
                    className="relative group/event"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      className={cn(
                        "w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold truncate transition-all shadow-sm",
                        event.event_type === "appointment" ? "bg-[#0D3B6E] text-white" :
                        event.event_type === "lab_test" ? "bg-[#F59E0B] text-white" :
                        event.event_type === "caregiver_visit" ? "bg-[#10B981] text-white" :
                        "bg-[#6B7280] text-white",
                        event.status === "suggested" && "opacity-70 border border-white/40 border-dashed",
                        "hover:scale-[1.02] active:scale-95"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-white/60 shrink-0" />
                        <span className="truncate">{event.title}</span>
                      </div>
                    </button>
                    {isEditMode && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center bg-white/20 backdrop-blur-md rounded-md p-0.5 opacity-0 group-hover/event:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditEvent?.(event); }}
                          className="p-1 hover:text-white transition-colors"
                        >
                          <Edit3 size={10} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteEvent?.(event.id); }}
                          className="p-1 hover:text-red-200 transition-colors"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

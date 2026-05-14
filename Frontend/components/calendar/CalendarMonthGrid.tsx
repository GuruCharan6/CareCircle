"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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

const EVENT_DOT: Record<string, string> = {
  appointment:     "bg-[#E5534B]",
  lab_test:        "bg-[#F59E0B]",
  caregiver_visit: "bg-[#10B981]",
};

const EVENT_COLORS: Record<string, string> = {
  appointment:     "bg-[#E5534B]",
  lab_test:        "bg-[#F59E0B]",
  caregiver_visit: "bg-[#10B981]",
};

export function CalendarMonthGrid({
  events,
  onEventClick,
  onAddClick,
  isEditMode = false,
  onEditEvent,
  onDeleteEvent,
}: CalendarMonthGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth  = new Date(year, month, 1);
  const lastDayOfMonth   = new Date(year, month + 1, 0);
  const startDay         = firstDayOfMonth.getDay();
  const totalDays        = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = startDay - 1; i >= 0; i--)
    days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false });
  for (let i = 1; i <= totalDays; i++)
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++)
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });

  const nextMonth  = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth  = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToToday  = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

  const monthName = currentDate.toLocaleDateString("en-IN", { month: "long" });
  const todayStr  = formatDateLocal(new Date());

  const getEventsForDay = (date: Date) => {
    const dStr = formatDateLocal(date);
    return events.filter(e => e.event_date === dStr);
  };

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  function handleDayClick(date: Date, isCurrentMonth: boolean) {
    if (!isCurrentMonth) return;
    if (selectedDate && formatDateLocal(date) === formatDateLocal(selectedDate)) {
      // Second tap → open add form
      onAddClick(date);
    } else {
      setSelectedDate(date);
    }
  }

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="px-2 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base lg:text-xl font-bold text-[#1F2937]">
            {monthName} <span className="font-medium text-[#9CA3AF]">{year}</span>
          </h3>
          <button
            onClick={goToToday}
            className="px-2.5 py-1 text-[10px] font-bold text-[#0D3B6E] bg-[#0D3B6E]/8 hover:bg-[#0D3B6E]/15 rounded-full transition-all"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={prevMonth} className="p-2 hover:bg-black/5 rounded-xl transition-colors text-[#6B7280]">
            <ChevronLeft size={18} />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-black/5 rounded-xl transition-colors text-[#6B7280]">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday headers — 2-letter */}
      <div className="grid grid-cols-7 mb-1">
        {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-1.5 text-center text-[11px] font-bold uppercase tracking-wider",
              i === 6 ? "text-[#E5534B]" : "text-[#9CA3AF]"
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells — no grid lines */}
      <div className="grid grid-cols-7">
        {days.map(({ date, isCurrentMonth }, i) => {
          const dayEvents  = getEventsForDay(date);
          const isToday    = formatDateLocal(date) === todayStr;
          const isSelected = selectedDate && formatDateLocal(date) === formatDateLocal(selectedDate);
          const isSaturday = date.getDay() === 6;
          const uniqueTypes = [...new Set(dayEvents.map(e => e.event_type))];

          return (
            <div
              key={date.getTime()}
              onClick={() => isCurrentMonth && handleDayClick(date, isCurrentMonth)}
              className={cn(
                "min-h-[60px] lg:min-h-[72px] flex flex-col items-center pt-2 pb-1.5 gap-1 transition-colors rounded-xl",
                isCurrentMonth ? "cursor-pointer hover:bg-black/5 active:bg-black/8" : "pointer-events-none",
                isSelected && !isToday && "bg-black/5",
              )}
            >
              {/* Day number */}
              <span className={cn(
                "w-9 h-9 flex items-center justify-center text-base font-bold rounded-xl transition-all leading-none",
                isToday
                  ? "bg-[#0D3B6E] text-white shadow-sm"
                  : !isCurrentMonth
                    ? "text-[#C5C5C5]"
                    : isSaturday
                      ? "text-[#E5534B]"
                      : "text-[#1F2937]"
              )}>
                {date.getDate()}
              </span>

              {/* Event dots */}
              {uniqueTypes.length > 0 && (
                <div className="flex items-center gap-0.5 flex-wrap justify-center">
                  {uniqueTypes.slice(0, 3).map(type => (
                    <span
                      key={type}
                      className={cn("w-1.5 h-1.5 rounded-full shrink-0", EVENT_DOT[type] ?? "bg-[#6B7280]")}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-3 pb-1 px-2">
        {[
          { label: "Appointment", color: "bg-[#E5534B]" },
          { label: "Caregiver",   color: "bg-[#10B981]" },
          { label: "Lab",         color: "bg-[#F59E0B]" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full shrink-0", color)} />
            <span className="text-[11px] text-[#6B7280] font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Selected day event list */}
      {selectedDate && (
        <div className="border-t border-[#E5E7EB] mt-2 pt-4 px-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[#1F2937]">
              {selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <button
              onClick={() => onAddClick(selectedDate)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#0D3B6E] text-white rounded-lg text-xs font-bold"
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-xs text-[#9CA3AF] py-2">No events. Tap Add to create one.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2",
                    EVENT_COLORS[ev.event_type] ?? "bg-[#6B7280]"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-white/50 shrink-0" />
                  <span className="flex-1 truncate">{ev.title}</span>
                  {ev.event_time && (
                    <span className="text-white/70 text-xs shrink-0">{ev.event_time}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

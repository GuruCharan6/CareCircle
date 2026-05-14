"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 lg:mb-8", className)}>
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--color-muted)] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

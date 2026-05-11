import { cn } from "@/lib/utils";
import React from "react";

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  padding?: "none" | "sm" | "md" | "lg";
  title?: React.ReactNode;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
}

const paddingClasses = {
  none: "",
  sm:   "p-3",
  md:   "p-5",
  lg:   "p-6",
};

function Card({ 
  padding = "md", 
  title, 
  icon,
  headerAction, 
  className, 
  children, 
  ...props 
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden",
        className
      )}
      {...props}
    >
      {(title || headerAction || icon) && (
        <CardHeader className="px-5 py-4 border-b border-[var(--color-surface)] mb-0">
          <div className="flex items-center gap-2">
            {icon}
            {title && <CardTitle>{title}</CardTitle>}
          </div>
          {headerAction}
        </CardHeader>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
    </div>
  );
}

function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wide", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export { Card, CardHeader, CardTitle };

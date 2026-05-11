"use client";

import { PatientProvider } from "./PatientProvider";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PatientProvider>
      {children}
    </PatientProvider>
  );
}

"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Upload, FilePlus, ArrowRight } from "lucide-react";
import Link from "next/link";

export function UploadCard() {
  return (
    <Card 
      className="bg-gradient-to-br from-[var(--color-action)] to-[var(--color-primary)] border-none shadow-xl relative overflow-hidden group"
      padding="lg"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
        <Upload size={120} className="text-white" />
      </div>
      
      <div className="relative z-10 space-y-4">
        <div className="p-2.5 bg-white/20 rounded-xl w-fit backdrop-blur-md">
          <FilePlus className="text-white" size={24} />
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Upload New Data</h3>
          <p className="text-white/80 text-sm mt-1 max-w-[240px]">
            Instantly extract data from prescriptions, lab results, or handwritten notes.
          </p>
        </div>

        <Link href="/upload" className="block">
          <Button variant="secondary" className="w-full justify-between h-12 text-sm font-bold shadow-lg hover:shadow-xl transition-all">
            Start Upload
            <ArrowRight size={18} />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

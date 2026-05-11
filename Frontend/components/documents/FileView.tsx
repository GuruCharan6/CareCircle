"use client";

import Image from "next/image";

interface FileViewProps {
  url: string;
  mimeType: string;
}

export function FileView({ url, mimeType }: FileViewProps) {
  const isPdf = mimeType === "application/pdf";

  return (
    <div className="w-full h-full bg-slate-50 rounded-xl border border-[var(--color-border)] overflow-hidden flex flex-col">
      <div className="bg-white border-b border-[var(--color-border)] px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-muted)] truncate">{url.split('/').pop()}</span>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] text-[var(--color-action)] hover:underline font-bold"
        >
          OPEN IN NEW TAB
        </a>
      </div>
      <div className="flex-1 relative min-h-0">
        {isPdf ? (
          <iframe 
            src={`${url}#toolbar=0&navpanes=0&scrollbar=0`} 
            className="w-full h-full border-none"
            title="PDF Preview"
          />
        ) : (
          <div className="w-full h-full p-4 flex items-center justify-center">
            <img 
              src={url} 
              alt="Document preview" 
              className="max-w-full max-h-full object-contain shadow-sm rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

interface RecordingWaveProps {
  duration: number; // seconds
}

export function RecordingWave({ duration }: RecordingWaveProps) {
  const mins = String(Math.floor(duration / 60)).padStart(2, "0");
  const secs = String(duration % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
      <div className="flex items-center justify-center gap-1.5 h-12">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-[var(--color-action)]"
            style={{
              animation: `waveBar 1s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.05}s`,
              height: `${10 + Math.random() * 90}%`,
            }}
          />
        ))}
      </div>
      
      <div className="text-center space-y-1">
        <p className="font-mono text-3xl font-black text-[var(--color-primary)] tabular-nums tracking-tight">
          {mins}:{secs}
        </p>
        <p className="text-[10px] font-black text-[var(--color-alert)] uppercase tracking-[0.2em] animate-pulse flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-alert)]" />
          Recording Live
        </p>
      </div>

      <style>{`
        @keyframes waveBar {
          0%   { height: 20%; opacity: 0.4; }
          100% { height: 100%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

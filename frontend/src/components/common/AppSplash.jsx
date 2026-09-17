import React from 'react';

export default function AppSplash({ 
  message = 'Initializing workspace...', 
  subtext = 'Preparing project environment...' 
}) {
  return (
    <div className="fixed inset-0 z-50 bg-dominant flex flex-col items-center justify-center select-none overflow-hidden transition-colors duration-300">
      {/* Background radial glow */}
      <div className="absolute w-[450px] h-[450px] bg-accent/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      {/* Brand Logo Container */}
      <div className="relative flex flex-col items-center space-y-5 z-10">
        <div className="relative w-16 h-16 flex items-center justify-center bg-card-secondary border border-border-secondary/60 rounded-2xl shadow-xl backdrop-blur-xl animate-[pulse_2s_infinite]">
          <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9">
            <path d="M11.5 2C11.5 2 11.5 5.5 8 9C4.5 12.5 1 12.5 1 12.5L7.5 19L11.5 23L15 19.5L11.5 2Z" fill="var(--color-accent)" />
            <path d="M23 12.5C23 12.5 19.5 12.5 16 9C12.5 5.5 12.5 2 2 12.5L16.5 6L20.5 10L23 12.5Z" fill="var(--color-accent-hover)" />
            <path d="M12.5 22C12.5 22 16 22 19.5 18.5C23 15 23 11.5 23 11.5L19 15L15 19L12.5 22Z" fill="var(--color-accent)" opacity="0.8" />
          </svg>
        </div>

        {/* Brand Name & Micro Progress Status */}
        <div className="text-center space-y-2">
          <h1 className="text-xl font-extrabold text-text-secondary tracking-tight font-display">
            Jira <span className="text-accent">Clone</span>
          </h1>
          <div className="flex items-center space-x-2 justify-center text-xs text-text-secondary font-semibold">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
            <span>{message}</span>
          </div>
          {subtext && (
            <p className="text-[11px] text-text-secondary-muted max-w-xs">{subtext}</p>
          )}
        </div>
      </div>

      {/* Top Shimmer Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-accent/20 overflow-hidden">
        <div className="h-full bg-accent animate-[shimmer_1.5s_infinite] w-1/3"></div>
      </div>
    </div>
  );
}


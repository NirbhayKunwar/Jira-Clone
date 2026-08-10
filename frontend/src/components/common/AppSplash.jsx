import React from 'react';

export default function AppSplash() {
  return (
    <div className="fixed inset-0 z-50 bg-[#070c19] flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute w-[400px] h-[400px] bg-accent/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      {/* Brand Logo Container */}
      <div className="relative flex flex-col items-center space-y-5 z-10">
        <div className="relative w-16 h-16 flex items-center justify-center bg-accent/10 border border-accent/30 rounded-2xl shadow-2xl backdrop-blur-xl animate-[pulse_2s_infinite]">
          <svg
            className="w-9 h-9 text-accent"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        {/* Brand Name & Micro Progress Status */}
        <div className="text-center space-y-2">
          <h1 className="text-lg font-bold text-white tracking-wide font-sans">
            Jira<span className="text-accent">Clone</span>
          </h1>
          <div className="flex items-center space-x-2 justify-center text-xs text-slate-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping"></span>
            <span>Initializing workspace...</span>
          </div>
        </div>
      </div>

      {/* Top Shimmer Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-accent/20 overflow-hidden">
        <div className="h-full bg-accent animate-[shimmer_1.5s_infinite] w-1/3"></div>
      </div>
    </div>
  );
}

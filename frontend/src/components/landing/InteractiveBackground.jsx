import React from 'react';

/**
 * Pure Atlassian Crisp Background Component.
 * Provides a clean solid background adhering to official Jira/Atlassian visual language.
 */
export default function InteractiveBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 bg-dominant"
      aria-hidden="true"
    />
  );
}



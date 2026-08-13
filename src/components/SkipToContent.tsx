import React from 'react';

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only absolute left-0 top-0 m-4 p-2 bg-white text-primary-600 rounded shadow-md z-50"
    >
      Skip to main content
    </a>
  );
}

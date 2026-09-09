'use client';

import React, { useState } from 'react';
import { ReceiptPrinterCard } from './ReceiptPrinterCard';

export function ReceiptPrinterCardDemo() {
  const [key, setKey] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center min-h-[640px] py-12 px-4 bg-[#09090B] rounded-2xl border border-[#27272A] shadow-2xl">
      <div className="mb-8 flex items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
          Checkout Status &amp; Receipt Printer
        </span>
        <button
          type="button"
          onClick={() => setKey((k) => k + 1)}
          className="px-3 py-1.5 text-xs font-medium text-[#D4D4D8] bg-[#27272A] hover:bg-[#3F3F46] rounded-md transition-colors cursor-pointer"
        >
          Replay
        </button>
      </div>

      <div className="pb-80">
        <ReceiptPrinterCard key={key} />
      </div>
    </div>
  );
}

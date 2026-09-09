'use client';

import React, { useState, useEffect } from 'react';

export type CheckoutPhase = 'processing' | 'printing' | 'complete';

interface ReceiptPrinterCardProps {
  /** Optional callback triggered when status phase changes */
  onPhaseChange?: (phase: CheckoutPhase) => void;
  /** Optional override for initial phase (defaults to 'processing') */
  initialPhase?: CheckoutPhase;
  /** Optional toggle to auto-advance phases (defaults to true) */
  autoAdvance?: boolean;
}

const BARCODE_BARS = [
  { width: 3, transparent: false },
  { width: 2, transparent: true },
  { width: 2, transparent: false },
  { width: 3, transparent: true },
  { width: 3, transparent: false },
  { width: 2, transparent: true },
  { width: 2, transparent: false },
  { width: 3, transparent: true },
  { width: 2, transparent: false },
  { width: 2, transparent: true },
  { width: 3, transparent: false },
  { width: 2, transparent: true },
  { width: 3, transparent: false },
  { width: 2, transparent: true },
  { width: 2, transparent: false },
  { width: 3, transparent: true },
  { width: 3, transparent: false },
  { width: 2, transparent: true },
  { width: 2, transparent: false },
  { width: 3, transparent: true },
  { width: 2, transparent: false },
  { width: 3, transparent: true },
  { width: 2, transparent: false },
  { width: 2, transparent: true },
];

export function ReceiptPrinterCard({
  onPhaseChange,
  initialPhase = 'processing',
  autoAdvance = true,
}: ReceiptPrinterCardProps) {
  const [phase, setPhase] = useState<CheckoutPhase>(initialPhase);

  useEffect(() => {
    if (!autoAdvance) return;

    const timer1 = setTimeout(() => {
      setPhase('printing');
    }, 1200);

    const timer2 = setTimeout(() => {
      setPhase('complete');
    }, 2800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [autoAdvance]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  const getStatusText = () => {
    switch (phase) {
      case 'processing':
        return 'Processing payment';
      case 'printing':
        return 'Printing receipt';
      case 'complete':
        return 'Order complete';
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin-linear {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .anim-spinner {
          animation: spin-linear 900ms linear infinite;
        }

        @keyframes progress-sweep {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(330%); }
        }
        .anim-progress {
          animation: progress-sweep 1400ms ease-in-out infinite;
        }

        @keyframes paper-print {
          from { transform: translateY(-100%); }
          to { transform: translateY(0%); }
        }
        .anim-paper {
          animation: paper-print 1600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes check-in {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }
        .anim-check {
          animation: check-in 220ms ease-out forwards;
        }
      `}</style>

      <div className="relative w-[360px]">
        {/* Status Card */}
        <div className="relative z-10 rounded-2xl bg-[#18181B] p-5 shadow-xl">
          {/* Header row */}
          <div className="flex justify-between items-center mb-4">
            {/* Left brand mark block */}
            <div className="w-[28px] h-[28px] rounded-lg bg-[#27272A] flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-white opacity-60 fill-current"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>

            {/* Right pill button */}
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full bg-[#27272A] px-3 py-1.5 text-xs text-[#D4D4D8]"
            >
              <svg
                className="w-4 h-4 text-[#D4D4D8] fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
              </svg>
              <span>Home</span>
            </button>
          </div>

          {/* Body row */}
          <div className="flex justify-between items-start mb-4">
            {/* Left column */}
            <div>
              <div className="text-white font-semibold text-base">Studio Pro</div>
              <div className="text-[#A1A1AA] text-sm">Monthly membership</div>
            </div>

            {/* Right column */}
            <div className="text-right">
              <div className="text-[#71717A] text-xs uppercase tracking-wide">Total</div>
              <div className="text-white font-semibold text-lg">$48.00</div>
            </div>
          </div>

          {/* Status row */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center">
              {phase === 'complete' ? (
                <svg
                  className="w-4 h-4 text-emerald-500 anim-check fill-none stroke-current stroke-[2.5] stroke-linecap-round stroke-linejoin-round"
                  viewBox="0 0 24 24"
                  aria-label="Checkmark icon"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-[#A1A1AA] anim-spinner fill-none stroke-current stroke-2 stroke-linecap-round"
                  viewBox="0 0 24 24"
                  aria-label="Loading spinner"
                >
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" />
                  <path d="M12 3a9 9 0 0 1 9 9" />
                </svg>
              )}
            </div>
            <span className="text-sm text-[#A1A1AA]">{getStatusText()}</span>
          </div>

          {/* Progress track */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl overflow-hidden bg-[#27272A] transition-opacity duration-200 ${
              phase === 'complete' ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div
              className={`h-full w-[30%] bg-[#52525B] ${
                phase !== 'complete' ? 'anim-progress' : ''
              }`}
            />
          </div>
        </div>

        {/* Paper Receipt */}
        <div
          className={`absolute left-1/2 top-full z-0 w-[86%] -translate-x-1/2 bg-[#FAFAFA] px-5 pt-5 pb-4 font-mono text-[#18181B] shadow-2xl rounded-t-lg ${
            phase !== 'processing' ? 'anim-paper' : ''
          }`}
          style={{
            transform: phase === 'processing' ? 'translateY(-100%)' : undefined,
            clipPath:
              'polygon(0% 0%, 100% 0%, 100% calc(100% - 10px), 97.5% 100%, 92.5% calc(100% - 10px), 87.5% 100%, 82.5% calc(100% - 10px), 77.5% 100%, 72.5% calc(100% - 10px), 67.5% 100%, 62.5% calc(100% - 10px), 57.5% 100%, 52.5% calc(100% - 10px), 47.5% 100%, 42.5% calc(100% - 10px), 37.5% 100%, 32.5% calc(100% - 10px), 27.5% 100%, 22.5% calc(100% - 10px), 17.5% 100%, 12.5% calc(100% - 10px), 7.5% 100%, 2.5% calc(100% - 10px), 0% 100%)',
          }}
        >
          {/* Brand mark block */}
          <div className="w-8 h-8 rounded-md bg-[#18181B] flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-4 h-4 text-white fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>

          {/* Item Row */}
          <div className="flex justify-between items-baseline font-bold text-sm text-[#18181B]">
            <span>Studio Pro</span>
            <span>$40.00</span>
          </div>
          <div className="text-xs text-[#71717A]">Monthly membership</div>

          {/* Divider */}
          <div className="my-3 border-b border-[#E4E4E7]" />

          {/* Breakdown Rows */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#71717A]">
              <span>Subtotal</span>
              <span className="text-[#18181B]">$40.00</span>
            </div>
            <div className="flex justify-between text-xs text-[#71717A]">
              <span>Tax</span>
              <span className="text-[#18181B]">$8.00</span>
            </div>
          </div>

          {/* Divider */}
          <div className="my-3 border-b border-[#E4E4E7]" />

          {/* Total Row */}
          <div className="flex justify-between font-bold text-sm text-[#18181B]">
            <span>TOTAL PAID</span>
            <span>$48.00</span>
          </div>

          {/* Metadata Rows */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[10px] uppercase tracking-wide text-[#71717A]">
              <span>Order</span>
              <span className="text-[#18181B]">ORD-7241</span>
            </div>
            <div className="flex justify-between text-[10px] uppercase tracking-wide text-[#71717A]">
              <span>Paid with</span>
              <span className="text-[#18181B]">Visa •••• 0114</span>
            </div>
            <div className="flex justify-between text-[10px] uppercase tracking-wide text-[#71717A]">
              <span>Date</span>
              <span className="text-[#18181B]">3 Sep 2026 · 11:02</span>
            </div>
          </div>

          {/* Barcode section */}
          <div className="mt-4 flex flex-col items-center">
            <div className="flex items-center justify-center h-8">
              {BARCODE_BARS.map((bar, i) => (
                <div
                  key={i}
                  className="h-8"
                  style={{
                    width: `${bar.width}px`,
                    backgroundColor: bar.transparent ? 'transparent' : '#18181B',
                  }}
                />
              ))}
            </div>
            <div className="mt-1 text-[10px] text-[#18181B] text-center tracking-widest font-mono">
              48291 00114
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

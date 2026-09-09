import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReceiptPrinterCard } from '@/components/ReceiptPrinterCard';

describe('ReceiptPrinterCard Component', () => {
  it('renders status card and paper receipt with initial processing phase', () => {
    const html = renderToString(
      <ReceiptPrinterCard autoAdvance={false} initialPhase="processing" />
    );

    expect(html).toContain('Processing payment');
    expect(html).toContain('Studio Pro');
    expect(html).toContain('Monthly membership');
    expect(html).toContain('$48.00');
    expect(html).toContain('anim-spinner');
    expect(html).toContain('anim-progress');
    expect(html).toContain('translateY(-100%)');
  });

  it('renders printing phase with anim-paper class', () => {
    const html = renderToString(
      <ReceiptPrinterCard autoAdvance={false} initialPhase="printing" />
    );

    expect(html).toContain('Printing receipt');
    expect(html).toContain('anim-paper');
    expect(html).toContain('anim-progress');
  });

  it('renders complete phase with checkmark, hidden progress bar, and complete order details', () => {
    const html = renderToString(
      <ReceiptPrinterCard autoAdvance={false} initialPhase="complete" />
    );

    expect(html).toContain('Order complete');
    expect(html).toContain('Checkmark icon');
    expect(html).toContain('opacity-0'); // Progress track hidden on complete
    expect(html).toContain('Subtotal');
    expect(html).toContain('$40.00');
    expect(html).toContain('Tax');
    expect(html).toContain('$8.00');
    expect(html).toContain('TOTAL PAID');
    expect(html).toContain('ORD-7241');
    expect(html).toContain('Visa •••• 0114');
    expect(html).toContain('3 Sep 2026 · 11:02');
    expect(html).toContain('48291 00114');
  });

  it('contains perforated edge clip-path polygon and keyframe animations', () => {
    const html = renderToString(
      <ReceiptPrinterCard autoAdvance={false} initialPhase="printing" />
    );

    expect(html).toContain('clip-path:polygon(');
    expect(html).toContain('2.5% calc(100% - 10px), 0% 100%)');
    expect(html).toContain('@keyframes spin-linear');
    expect(html).toContain('@keyframes progress-sweep');
    expect(html).toContain('@keyframes paper-print');
    expect(html).toContain('@keyframes check-in');
  });
});

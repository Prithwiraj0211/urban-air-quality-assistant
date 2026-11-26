import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';

describe('AeroShield AI App Integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders telemetry, weather, location detector, impact simulator, and WhatsApp advice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Offline test mode'))
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Offline Winter Benchmark/i)).toBeInTheDocument();
    });

    expect(screen.getByText('AeroShield AI')).toBeInTheDocument();
    expect(screen.getByText('Quantified Direct Impact Simulator')).toBeInTheDocument();
    expect(screen.getByText('2. Personalized Winter Smog Action Plan')).toBeInTheDocument();
    expect(screen.getByText('3. WhatsApp Personal Advice & Community Alert')).toBeInTheDocument();

    // Verify no exposed API key button is shown in UI
    expect(screen.queryByText(/Add Gemini Key/i)).not.toBeInTheDocument();

    // Verify Detect Location button is prominently visible
    expect(
      screen.getByRole('button', { name: /Detect My Current Location/i })
    ).toBeInTheDocument();

    // Test interactive Adopt All / Reset buttons
    const adoptAllBtn = screen.getByRole('button', { name: /Adopt All Plan Actions/i });
    fireEvent.click(adoptAllBtn);
    expect(screen.getByText('10/10 habits')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /^Reset$/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText('0/10 habits')).toBeInTheDocument();

    // Test WhatsApp validation & link dispatch
    const sendBtn = screen.getByRole('button', { name: /Send to WhatsApp/i });
    fireEvent.click(sendBtn);
    expect(
      screen.getByText(/Please enter a valid WhatsApp number/i)
    ).toBeInTheDocument();

    const phoneInput = screen.getByLabelText(/WhatsApp Number/i);
    fireEvent.change(phoneInput, { target: { value: '+91 98765 43210' } });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    fireEvent.click(sendBtn);
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toContain('https://wa.me/919876543210?text=');
  });
});

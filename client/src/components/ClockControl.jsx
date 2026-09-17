import React, { useState, useEffect } from 'react';
import { Clock, FastForward, Moon, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function ClockControl({ onClockAdvanced }) {
  const [clockTime, setClockTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [automationMsg, setAutomationMsg] = useState(null);

  const fetchClock = async () => {
    try {
      const data = await api.getClock();
      setClockTime(new Date(data.simulatedTime));
    } catch (err) {
      console.error('Failed to get clock:', err);
    }
  };

  useEffect(() => {
    fetchClock();
    const interval = setInterval(fetchClock, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAdvance = async (hours) => {
    setLoading(true);
    setAutomationMsg(null);
    try {
      const res = await api.postClock({ advanceHours: hours });
      setClockTime(new Date(res.simulatedTime));
      const autoClosed = res.nightlyAutoCloseJob?.sessionsAutoClosed || 0;
      if (autoClosed > 0) {
        setAutomationMsg(`Nightly Job: Auto-closed and billed ${autoClosed} session(s) parked over 24h ($${res.nightlyAutoCloseJob.totalBilled.toFixed(2)} total).`);
      } else {
        setAutomationMsg(`Clock advanced by ${hours} hr(s).`);
      }
      if (onClockAdvanced) onClockAdvanced();
    } catch (err) {
      console.error('Clock advance error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setAutomationMsg(null);
    try {
      const res = await api.postClock({ reset: true });
      setClockTime(new Date(res.simulatedTime));
      setAutomationMsg('Clock reset to live system time.');
      if (onClockAdvanced) onClockAdvanced();
    } catch (err) {
      console.error('Clock reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.75)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 16px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 'var(--radius-sm)',
          background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)'
        }}>
          <Clock size={16} />
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
            Virtual Garage Clock (POST /clock)
          </span>
          <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {clockTime ? clockTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' }) : 'Loading clock...'}
          </div>
        </div>
      </div>

      {automationMsg && (
        <div style={{
          fontSize: '0.8rem',
          color: 'var(--status-avail)',
          background: 'var(--status-avail-bg)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--status-avail-border)'
        }}>
          {automationMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
          onClick={() => handleAdvance(1)}
          disabled={loading}
          title="Advance clock by 1 hour"
        >
          <FastForward size={13} /> +1 hr
        </button>

        <button
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
          onClick={() => handleAdvance(12)}
          disabled={loading}
          title="Advance clock by 12 hours"
        >
          <FastForward size={13} /> +12 hrs
        </button>

        <button
          className="btn btn-primary"
          style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          onClick={() => handleAdvance(24)}
          disabled={loading}
          title="Advance by 24h & execute nightly 24h auto-close job"
        >
          <Moon size={13} /> +24h Nightly Job
        </button>

        <button
          className="btn btn-secondary"
          style={{ padding: '6px 8px', fontSize: '0.78rem' }}
          onClick={handleReset}
          disabled={loading}
          title="Reset to live system clock"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}

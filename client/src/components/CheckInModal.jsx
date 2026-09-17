import React, { useState } from 'react';
import { LogIn, X, CheckCircle, AlertCircle, Zap, Clock, Calendar } from 'lucide-react';
import { api } from '../services/api';

export default function CheckInModal({ isOpen, onClose, onSuccess }) {
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Compact');
  const [timeMode, setTimeMode] = useState('now'); // 'now', 'preset-2h', 'preset-5h', 'preset-1d', 'preset-2d', 'custom'
  const [customDateTime, setCustomDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ticketResult, setTicketResult] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!licensePlate.trim()) {
      setError('Please enter a valid license plate number.');
      return;
    }

    setLoading(true);
    setError(null);
    setTicketResult(null);

    let entryHoursAgo = 0;
    let customEntryTime = null;

    if (timeMode === 'preset-2h') entryHoursAgo = 2;
    else if (timeMode === 'preset-5h') entryHoursAgo = 5;
    else if (timeMode === 'preset-1d') entryHoursAgo = 24;
    else if (timeMode === 'preset-2d') entryHoursAgo = 48;
    else if (timeMode === 'custom' && customDateTime) {
      customEntryTime = new Date(customDateTime).toISOString();
    }

    try {
      const response = await api.checkIn({
        licensePlate: licensePlate.trim().toUpperCase(),
        vehicleType,
        entryHoursAgo,
        customEntryTime
      });
      setTicketResult(response);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setLicensePlate('');
    setVehicleType('Compact');
    setTimeMode('now');
    setCustomDateTime('');
    setError(null);
    setTicketResult(null);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogIn size={20} color="var(--primary)" />
            Vehicle Gate Check-In
          </h3>
          <button
            onClick={handleReset}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--status-occ-bg)',
            border: '1px solid var(--status-occ-border)',
            color: '#fda4af',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {ticketResult ? (
          <div>
            <div style={{
              background: 'var(--status-avail-bg)',
              border: '1px solid var(--status-avail-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <CheckCircle size={36} color="var(--status-avail)" style={{ margin: '0 auto 8px' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--status-avail)' }}>
                Spot Allocated Successfully!
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '4px' }}>
                Please proceed to the assigned parking stall.
              </p>
            </div>

            <div className="receipt-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Ticket Number:</span>
                <span className="mono" style={{ fontWeight: 700 }}>{ticketResult.ticket.ticketNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-subtle)' }}>License Plate:</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{ticketResult.ticket.licensePlate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Vehicle Type:</span>
                <span className={`badge ${
                  ticketResult.ticket.vehicleType === 'Compact' ? 'badge-compact' :
                  ticketResult.ticket.vehicleType === 'EV' ? 'badge-ev' : 'badge-standard'
                }`}>
                  {ticketResult.ticket.vehicleType === 'EV' && <Zap size={11} />}
                  {ticketResult.ticket.vehicleType}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Entry Timestamp:</span>
                <span style={{ fontSize: '0.85rem' }}>{new Date(ticketResult.ticket.entryTime).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Assigned Space:</span>
                <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-avail)' }}>
                  Level {ticketResult.assignedSpot.level} — {ticketResult.assignedSpot.spotNumber} ({ticketResult.assignedSpot.type})
                </span>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleReset}>
              Done & Close Gate
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                License Plate Number
              </label>
              <input
                type="text"
                className="input-field mono"
                placeholder="e.g., NY-9921, ABC-1234"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                autoFocus
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                Vehicle Type
              </label>
              <select
                className="input-field"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="Compact">Compact (Prefers Compact spot, falls back to Standard)</option>
                <option value="Standard">Standard (Standard spot only)</option>
                <option value="EV">EV (⚡ Requires EV Charger spot only)</option>
              </select>
            </div>

            {/* Entry Time Selection */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                Entry Time
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <button
                  type="button"
                  className={`btn ${timeMode === 'now' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => setTimeMode('now')}
                >
                  <Clock size={12} /> Now
                </button>
                <button
                  type="button"
                  className={`btn ${timeMode === 'preset-2h' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => setTimeMode('preset-2h')}
                >
                  2h ago
                </button>
                <button
                  type="button"
                  className={`btn ${timeMode === 'preset-5h' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => setTimeMode('preset-5h')}
                >
                  5h ago
                </button>
                <button
                  type="button"
                  className={`btn ${timeMode === 'preset-1d' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => setTimeMode('preset-1d')}
                >
                  1 Day ago (Daily Cap)
                </button>
                <button
                  type="button"
                  className={`btn ${timeMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => setTimeMode('custom')}
                >
                  Custom...
                </button>
              </div>

              {timeMode === 'custom' && (
                <input
                  type="datetime-local"
                  className="input-field"
                  style={{ fontSize: '0.85rem' }}
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  required
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Allocating Spot...' : 'Assign Spot & Check In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { LogOut, X, Receipt, CheckCircle, AlertCircle, Clock, DollarSign, Zap } from 'lucide-react';
import { api } from '../services/api';

export default function CheckOutModal({ isOpen, onClose, onSuccess, initialPlate = '' }) {
  const [identifier, setIdentifier] = useState(initialPlate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    if (initialPlate) {
      setIdentifier(initialPlate);
    }
  }, [initialPlate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please provide a License Plate or Ticket Number.');
      return;
    }

    setLoading(true);
    setError(null);
    setReceipt(null);

    try {
      const isTicket = identifier.trim().toUpperCase().startsWith('TKT-');
      const payload = isTicket
        ? { ticketNumber: identifier.trim() }
        : { licensePlate: identifier.trim().toUpperCase() };

      const result = await api.checkOut(payload);
      setReceipt(result.receipt);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIdentifier('');
    setError(null);
    setReceipt(null);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={20} color="var(--status-occ)" />
            Vehicle Gate Check-Out & Exit
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

        {receipt ? (
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
                Check-Out Completed! Spot Released
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '4px' }}>
                Spot <strong>{receipt.spotNumber} (Level {receipt.level})</strong> is now marked AVAILABLE.
              </p>
            </div>

            {/* Receipt Details */}
            <div className="receipt-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Ticket #:</span>
                <span className="mono" style={{ fontWeight: 600 }}>{receipt.ticketNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-subtle)' }}>License Plate:</span>
                <span className="mono" style={{ fontWeight: 800, fontSize: '1.1rem' }}>{receipt.licensePlate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Vehicle Type:</span>
                <span className={`badge ${
                  receipt.vehicleType === 'Compact' ? 'badge-compact' :
                  receipt.vehicleType === 'EV' ? 'badge-ev' : 'badge-standard'
                }`}>
                  {receipt.vehicleType === 'EV' && <Zap size={10} />}
                  {receipt.vehicleType}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Check-In Time:</span>
                <span>{new Date(receipt.entryTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Check-Out Time:</span>
                <span>{new Date(receipt.exitTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}</span>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Actual Stay Duration:</span>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {receipt.actualDuration || `${receipt.billedHours}h`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>Billed Hours:</span>
                <span className="badge badge-standard">{receipt.billedHours} hr(s) (rounded up)</span>
              </div>

              {/* Fee Calculation Breakdown */}
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px dashed rgba(255,255,255,0.1)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>1st Hour Fee:</span>
                  <span>${receipt.feeBreakdown?.firstHourFee?.toFixed(2) || '10.00'}</span>
                </div>
                {receipt.billedHours > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{receipt.billedHours - 1} Additional Hr(s) @ ${receipt.feeBreakdown?.rateSnapshot?.additionalHourRate?.toFixed(2)}:</span>
                    <span>${receipt.feeBreakdown?.additionalHoursFee?.toFixed(2)}</span>
                  </div>
                )}
                {receipt.feeBreakdown?.dailyCapApplied && (
                  <div style={{ color: '#38bdf8', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ★ Daily Cap applied ($40/24h)
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.15)'
              }}>
                <span style={{ fontWeight: 700 }}>Total Fee Charged:</span>
                <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-avail)' }}>
                  ${receipt.totalFee?.toFixed(2)}
                </span>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleReset}>
              Close & Open Exit Gate
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                License Plate or Ticket Number
              </label>
              <input
                type="text"
                className="input-field mono"
                placeholder="e.g. ABC-1234 or TKT-..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                autoFocus
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'block' }}>
                Enter the vehicle's license plate to automatically compute duration & tiered fee.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Cancel
              </button>
              <button type="submit" className="btn btn-danger" disabled={loading}>
                {loading ? 'Calculating Fee...' : 'Calculate Fee & Check Out'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

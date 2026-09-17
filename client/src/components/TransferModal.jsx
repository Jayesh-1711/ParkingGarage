import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, X, CheckCircle, AlertCircle, Car, Shield } from 'lucide-react';
import { api } from '../services/api';

export default function TransferModal({ isOpen, onClose, onSuccess, initialPlate = '' }) {
  const [currentPlate, setCurrentPlate] = useState(initialPlate);
  const [newPlate, setNewPlate] = useState('');
  const [notes, setNotes] = useState('Valet hand-off');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (initialPlate) {
      setCurrentPlate(initialPlate);
    }
  }, [initialPlate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPlate.trim() || !newPlate.trim()) {
      setError('Please provide both current and new license plate numbers.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.transferTicket({
        currentPlate: currentPlate.trim().toUpperCase(),
        newPlate: newPlate.trim().toUpperCase(),
        notes: notes.trim()
      });
      setResult(res);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentPlate('');
    setNewPlate('');
    setNotes('Valet hand-off');
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={20} color="var(--accent-cyan)" />
            Valet Session Transfer (Hand-Off)
          </h3>
          <button
            onClick={handleReset}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Transfer an active parking session to a different vehicle plate (e.g. valet hand-off). The assigned spot stall and original entry time carry over.
        </p>

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

        {result ? (
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
                Session Transferred Successfully!
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '4px' }}>
                Active ticket now assigned to plate <strong>{result.ticket.licensePlate}</strong>.
              </p>
            </div>

            <div className="receipt-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Ticket #:</span>
                <span className="mono" style={{ fontWeight: 600 }}>{result.ticket.ticketNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-subtle)' }}>New Plate:</span>
                <span className="mono" style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-cyan)' }}>
                  {result.ticket.licensePlate}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Carried Over Stall:</span>
                <span className="mono" style={{ fontWeight: 700 }}>
                  Level {result.ticket.level} — {result.ticket.spotNumber}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Original Entry Time:</span>
                <span style={{ fontSize: '0.85rem' }}>{new Date(result.ticket.entryTime).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Audit History:</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {result.ticket.transferHistory?.length} transfer record(s) logged
                </span>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleReset}>
              Done & Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                Current Active License Plate
              </label>
              <input
                type="text"
                className="input-field mono"
                placeholder="e.g., ABC-1234"
                value={currentPlate}
                onChange={(e) => setCurrentPlate(e.target.value.toUpperCase())}
                autoFocus
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                New Target License Plate
              </label>
              <input
                type="text"
                className="input-field mono"
                placeholder="e.g., VALET-9921"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                Transfer Reason / Valet Notes
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Valet driver hand-off #12"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Transferring...' : 'Transfer Session'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

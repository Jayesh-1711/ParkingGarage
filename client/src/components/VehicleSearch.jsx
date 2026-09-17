import React, { useState } from 'react';
import { Search, MapPin, Clock, DollarSign, AlertCircle, Car, Zap, ArrowRightLeft } from 'lucide-react';
import { api } from '../services/api';

export default function VehicleSearch({ onQuickCheckOut, onQuickTransfer }) {
  const [searchPlate, setSearchPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchPlate.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.searchVehicle(searchPlate.trim());
      setResult(data);
    } catch (err) {
      setError(err.message || 'No active parked vehicle found with this plate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} color="var(--primary)" />
          Attendant Vehicle Plate Lookup
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Instantly find any parked car by its plate, view its floor/spot, accrued fees, and perform valet transfer or checkout
        </p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', maxWidth: '600px' }}>
        <input
          type="text"
          className="input-field mono"
          placeholder="Enter License Plate (e.g. TESLA-01, ABC-1234)"
          value={searchPlate}
          onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
          {loading ? 'Searching...' : 'Locate Vehicle'}
        </button>
      </form>

      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.08)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          color: '#fda4af',
          padding: '12px',
          borderRadius: 'var(--radius-md)',
          marginTop: '16px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: '20px',
          background: 'rgba(10, 14, 23, 0.6)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="mono" style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                  {result.ticket.licensePlate}
                </span>
                <span className={`badge ${
                  result.ticket.vehicleType === 'Compact' ? 'badge-compact' :
                  result.ticket.vehicleType === 'EV' ? 'badge-ev' : 'badge-standard'
                }`}>
                  {result.ticket.vehicleType === 'EV' && <Zap size={10} />}
                  {result.ticket.vehicleType}
                </span>
              </div>
              <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                Ticket: {result.ticket.ticketNumber} • Checked in: {new Date(result.ticket.entryTime).toLocaleString()}
              </span>
              {result.ticket.transferHistory && result.ticket.transferHistory.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                  ★ Transferred from {result.ticket.transferHistory.map(t => t.fromPlate).join(', ')}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => onQuickTransfer && onQuickTransfer(result.ticket.licensePlate)}
                title="Transfer session to another plate"
              >
                <ArrowRightLeft size={15} /> Valet Transfer
              </button>
              <button
                className="btn btn-danger"
                onClick={() => onQuickCheckOut && onQuickCheckOut(result.ticket.licensePlate)}
              >
                Proceed to Check Out & Settle Fee
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'var(--status-avail-bg)', borderRadius: 'var(--radius-sm)', color: 'var(--status-avail)' }}>
                <MapPin size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Assigned Location</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                  Level {result.ticket.level} — <span className="mono">{result.ticket.spotNumber}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}>
                <Clock size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Actual Stay Duration</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {result.currentEstimate.actualDurationFormatted || `${result.currentEstimate.elapsedMinutes}m`}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ({result.currentEstimate.billedHours} hr billed rounded up)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cyan)' }}>
                <DollarSign size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Current Accrued Fee</div>
                <div className="mono" style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--status-avail)' }}>
                  ${result.currentEstimate.accruedFee.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

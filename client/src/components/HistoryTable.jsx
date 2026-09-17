import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Calendar, Clock, DollarSign, Zap } from 'lucide-react';
import { api } from '../services/api';

export default function HistoryTable() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterPlate, setFilterPlate] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory({ plate: filterPlate });
      setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filterPlate]);

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--primary)" />
            Attendant Parking Session Log ({history.length} Records)
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Complete ledger of vehicle entries, exits, actual stay durations, and collected tiered fees
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input-field mono"
              placeholder="Filter by Plate..."
              style={{ paddingLeft: '32px', width: '220px', fontSize: '0.85rem' }}
              value={filterPlate}
              onChange={(e) => setFilterPlate(e.target.value.toUpperCase())}
            />
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          </div>

          <button className="btn btn-secondary" onClick={fetchHistory} disabled={loading} title="Refresh Log">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="history-table">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>License Plate</th>
              <th>Type</th>
              <th>Stall</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Actual Stay</th>
              <th>Billed Hrs</th>
              <th>Fee Charged</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-subtle)' }}>
                  {loading ? 'Loading parking logs...' : 'No completed parking sessions found.'}
                </td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item._id}>
                  <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {item.ticketNumber}
                  </td>
                  <td className="mono" style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                    {item.licensePlate}
                  </td>
                  <td>
                    <span className={`badge ${
                      item.vehicleType === 'Compact' ? 'badge-compact' :
                      item.vehicleType === 'EV' ? 'badge-ev' : 'badge-standard'
                    }`}>
                      {item.vehicleType === 'EV' && <Zap size={10} />}
                      {item.vehicleType}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontWeight: 600 }}>{item.spotNumber}</span> (L{item.level})
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(item.entryTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {item.exitTime ? new Date(item.exitTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {item.actualDuration || `${item.durationHours}h`}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-standard">{item.durationHours} hr</span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--status-avail)' }}>
                      ${item.totalFee?.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

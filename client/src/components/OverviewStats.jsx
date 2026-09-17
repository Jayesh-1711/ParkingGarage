import React from 'react';
import { Car, Zap, CheckCircle2, AlertCircle, Percent, BatteryCharging } from 'lucide-react';

export default function OverviewStats({ summary }) {
  if (!summary) return null;

  const evAvailable = summary.ev?.available ?? 0;
  const evTotal = summary.ev?.total ?? 0;
  const evOccupied = summary.ev?.occupied ?? 0;

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Attendant Quick EV Alert Banner */}
      <div style={{
        background: evAvailable > 0 ? 'rgba(6, 182, 212, 0.12)' : 'rgba(244, 63, 94, 0.12)',
        border: `1px solid ${evAvailable > 0 ? 'rgba(6, 182, 212, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 18px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: evAvailable > 0 ? 'var(--accent-cyan)' : 'var(--status-occ)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#000'
          }}>
            <Zap size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {evAvailable > 0 ? (
                <>⚡ {evAvailable} EV Charging Spot{evAvailable > 1 ? 's' : ''} Available Right Now</>
              ) : (
                <>⚠️ All EV Charging Spots Are Currently Full ({evTotal}/{evTotal})</>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Driver inquiry answer: {evAvailable > 0 ? `${evAvailable} of ${evTotal} charger spots ready for immediate check-in` : 'No EV chargers open'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-ev">
            {evAvailable} Available
          </span>
          <span className="badge badge-occupied">
            {evOccupied} In Use
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="stats-grid">
        {/* Total Occupancy Card */}
        <div className="glass-panel stat-card">
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Overall Garage Occupancy
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {summary.occupancyRate}%
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
                ({summary.occupiedSpots} / {summary.totalSpots} spots)
              </span>
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Percent size={22} />
          </div>
        </div>

        {/* Available Spots Card */}
        <div className="glass-panel stat-card">
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Available Open Spots
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--status-avail)' }}>
                {summary.availableSpots}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
                Open for parking
              </span>
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'var(--status-avail-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--status-avail)'
          }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Spot Breakdown by Vehicle Size */}
        <div className="glass-panel stat-card">
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Spot Types Open
            </span>
            <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>Compact</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{summary.compact?.available}/{summary.compact?.total}</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>Standard</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{summary.standard?.available}/{summary.standard?.total}</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>EV</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{summary.ev?.available}/{summary.ev?.total}</div>
              </div>
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)'
          }}>
            <Car size={22} />
          </div>
        </div>
      </div>
    </div>
  );
}

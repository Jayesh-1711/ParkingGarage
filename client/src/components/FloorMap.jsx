import React, { useState } from 'react';
import { Layers, Car, Zap, ArrowRightLeft } from 'lucide-react';

export default function FloorMap({ spots, levels, onSelectSpot, onTransferPlate }) {
  const [activeLevel, setActiveLevel] = useState(1);

  const availableLevels = levels && levels.length > 0 ? levels : [{ level: 1 }];
  const currentSpots = spots.filter(s => s.level === activeLevel);

  return (
    <div className="glass-panel floor-map-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--primary)" />
            Live Garage Floor Plan
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time visual map of all parking stalls and vehicle assignments
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-avail)' }}></span> Available
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-occ)' }}></span> Occupied
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)' }}></span> EV Charger
          </span>
        </div>
      </div>

      {/* Level Selection Tabs */}
      <div className="level-tabs">
        {availableLevels.map(lvl => (
          <button
            key={lvl.level}
            className={`level-pill ${activeLevel === lvl.level ? 'active' : ''}`}
            onClick={() => setActiveLevel(lvl.level)}
          >
            Level {lvl.level} ({lvl.available ?? 0} open)
          </button>
        ))}
      </div>

      {/* Spot Grid */}
      <div className="spots-grid">
        {currentSpots.map(spot => {
          const typeBadgeClass =
            spot.type === 'Compact'
              ? 'badge-compact'
              : spot.type === 'EV'
              ? 'badge-ev'
              : 'badge-standard';

          return (
            <div
              key={spot._id}
              className={`spot-card ${spot.isOccupied ? 'occupied' : 'available'}`}
              onClick={() => onSelectSpot && onSelectSpot(spot)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="mono" style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {spot.spotNumber}
                </span>
                <span className={`badge ${typeBadgeClass}`}>
                  {spot.type === 'EV' && <Zap size={11} />}
                  {spot.type}
                </span>
              </div>

              <div style={{ marginTop: '12px' }}>
                {spot.isOccupied ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-occ)' }}>
                      <Car size={14} />
                      <span className="mono" style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                        {spot.currentTicketId?.licensePlate || 'OCCUPIED'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                        {spot.currentTicketId?.vehicleType}
                      </span>
                      {spot.currentTicketId?.licensePlate && onTransferPlate && (
                        <button
                          style={{
                            background: 'rgba(6, 182, 212, 0.15)',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                            color: '#38bdf8',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTransferPlate(spot.currentTicketId.licensePlate);
                          }}
                          title="Transfer session (Valet Hand-off)"
                        >
                          <ArrowRightLeft size={10} /> Valet
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--status-avail)', fontSize: '0.8rem', fontWeight: 600 }}>
                    ● Open Spot
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { Warehouse, LogIn, LogOut, Settings as SettingsIcon, Search } from 'lucide-react';

export default function Header({ onOpenCheckIn, onOpenCheckOut, onOpenSettings }) {
  return (
    <header className="glass-panel app-header">
      <div className="logo-section">
        <div className="logo-icon">
          <Warehouse size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            AutoPark Garage MVP
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Multi-Level Smart Allocation & Management System
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button className="btn btn-primary" onClick={onOpenCheckIn} id="btn-checkin">
          <LogIn size={16} /> Check In Vehicle
        </button>
        <button className="btn btn-danger" onClick={onOpenCheckOut} id="btn-checkout">
          <LogOut size={16} /> Check Out Vehicle
        </button>
        <button className="btn btn-secondary" onClick={onOpenSettings} title="Settings" id="btn-settings">
          <SettingsIcon size={16} />
        </button>
      </div>
    </header>
  );
}

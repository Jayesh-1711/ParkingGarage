import React, { useState, useEffect } from 'react';
import { Settings, X, DollarSign, Layers, CheckCircle, AlertCircle, Save, RotateCcw, FileText, Sparkles, Upload } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsModal({ isOpen, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('pricing'); // 'pricing', 'messy', 'layout'
  
  // Pricing state
  const [pricing, setPricing] = useState({
    firstHourRate: 10,
    additionalHourRate: 5,
    dailyCap: 40
  });

  // Messy input state
  const sampleMessyText = `{
  "Compact_Spots": {
    "first_hour_cost": " $7.50 / hr ",
    "extra_hourly_charge": "USD 3.50",
    "daily_maximum_cap": " 28.00 bucks "
  },
  "STANDARD": {
    "1st_hour": "$11.00",
    "addl_hour": "  5.50 usd  ",
    "24h_max_cap": "$42.00"
  },
  "EV_Charger_Spots": {
    "initial_first_hr": " 14.00 EUR ",
    "subsequent_hour_rate": " 7.00 ",
    "day_cap": " $55.00 "
  }
}`;

  const [messyText, setMessyText] = useState(sampleMessyText);

  // Garage layout state
  const [layout, setLayout] = useState({
    levels: 3,
    compactPerLevel: 4,
    standardPerLevel: 4,
    evPerLevel: 2,
    resetTickets: false
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadPricing();
    }
  }, [isOpen]);

  const loadPricing = async () => {
    try {
      const data = await api.getPricing();
      setPricing({
        firstHourRate: data.firstHourRate,
        additionalHourRate: data.additionalHourRate,
        dailyCap: data.dailyCap,
        ratesBySpotType: data.ratesBySpotType
      });
    } catch (err) {
      console.error('Failed to load pricing:', err);
    }
  };

  if (!isOpen) return null;

  const handleSavePricing = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      await api.updatePricing(pricing);
      setMsg('Pricing rates updated successfully!');
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportMessy = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await api.importMessyRates(messyText);
      setMsg('Messy rate card parsed and applied to all spot types!');
      loadPricing();
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReseedGarage = async (e) => {
    e.preventDefault();
    if (!window.confirm('Re-seeding will recreate the garage spots and clear active vehicles. Continue?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      await api.reseedGarage(layout);
      setMsg(`Garage layout reconfigured: ${layout.levels} levels created!`);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: '620px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} color="var(--primary)" />
            Garage Configuration & Twists
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          <button
            className={`btn ${activeTab === 'pricing' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '7px 10px', fontSize: '0.82rem' }}
            onClick={() => { setActiveTab('pricing'); setMsg(null); setError(null); }}
          >
            <DollarSign size={14} /> Rates
          </button>
          <button
            className={`btn ${activeTab === 'messy' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '7px 10px', fontSize: '0.82rem' }}
            onClick={() => { setActiveTab('messy'); setMsg(null); setError(null); }}
          >
            <Sparkles size={14} /> Level 1: Import Messy
          </button>
          <button
            className={`btn ${activeTab === 'layout' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '7px 10px', fontSize: '0.82rem' }}
            onClick={() => { setActiveTab('layout'); setMsg(null); setError(null); }}
          >
            <Layers size={14} /> Layout
          </button>
        </div>

        {msg && (
          <div style={{
            background: 'var(--status-avail-bg)',
            border: '1px solid var(--status-avail-border)',
            color: 'var(--status-avail)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={16} />
            {msg}
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--status-occ-bg)',
            border: '1px solid var(--status-occ-border)',
            color: '#fda4af',
            padding: '10px 14px',
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

        {activeTab === 'pricing' && (
          <form onSubmit={handleSavePricing}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                First Hour Rate ($)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="input-field mono"
                value={pricing.firstHourRate}
                onChange={(e) => setPricing({ ...pricing, firstHourRate: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Additional Hour Rate ($) (Cheaper rate)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="input-field mono"
                value={pricing.additionalHourRate}
                onChange={(e) => setPricing({ ...pricing, additionalHourRate: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Daily Cap ($ per 24 hours)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                className="input-field mono"
                value={pricing.dailyCap}
                onChange={(e) => setPricing({ ...pricing, dailyCap: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={16} /> {loading ? 'Saving...' : 'Save Rates'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'messy' && (
          <form onSubmit={handleImportMessy}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Paste Dirty / Messy Rate Card (JSON, Text, or Key-Value pairs with currency signs and junk)
              </label>
              <textarea
                className="input-field mono"
                rows="8"
                style={{ fontSize: '0.8rem', lineHeight: 1.4, resize: 'vertical' }}
                value={messyText}
                onChange={(e) => setMessyText(e.target.value)}
                placeholder="Paste messy rate card data here..."
                required
              />
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '18px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)'
            }}>
              ✨ The cleaner parses currency symbols ($, USD, EUR), irregular key names (`compact_first_hour`, `1st_hr`, `daily_cap`), and configures distinct pricing for Compact, Standard, and EV stalls.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Upload size={16} /> {loading ? 'Cleaning & Importing...' : 'Clean & Apply Rates'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'layout' && (
          <form onSubmit={handleReseedGarage}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Total Garage Levels (Floors)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                className="input-field mono"
                value={layout.levels}
                onChange={(e) => setLayout({ ...layout, levels: parseInt(e.target.value) || 1 })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Compact / Floor
                </label>
                <input
                  type="number"
                  min="0"
                  className="input-field mono"
                  value={layout.compactPerLevel}
                  onChange={(e) => setLayout({ ...layout, compactPerLevel: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Standard / Floor
                </label>
                <input
                  type="number"
                  min="0"
                  className="input-field mono"
                  value={layout.standardPerLevel}
                  onChange={(e) => setLayout({ ...layout, standardPerLevel: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  EV / Floor
                </label>
                <input
                  type="number"
                  min="0"
                  className="input-field mono"
                  value={layout.evPerLevel}
                  onChange={(e) => setLayout({ ...layout, evPerLevel: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              Total capacity will be{' '}
              <strong style={{ color: 'var(--text-main)' }}>
                {layout.levels * (layout.compactPerLevel + layout.standardPerLevel + layout.evPerLevel)} spots
              </strong>{' '}
              ({layout.levels * layout.compactPerLevel} Compact, {layout.levels * layout.standardPerLevel} Standard, {layout.levels * layout.evPerLevel} EV).
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="submit" className="btn btn-danger" disabled={loading}>
                <RotateCcw size={16} /> {loading ? 'Rebuilding...' : 'Reconfigure Layout'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

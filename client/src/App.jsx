import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import OverviewStats from './components/OverviewStats';
import FloorMap from './components/FloorMap';
import VehicleSearch from './components/VehicleSearch';
import HistoryTable from './components/HistoryTable';
import CheckInModal from './components/CheckInModal';
import CheckOutModal from './components/CheckOutModal';
import TransferModal from './components/TransferModal';
import SettingsModal from './components/SettingsModal';
import ClockControl from './components/ClockControl';
import { Layers, Search, History, RefreshCw } from 'lucide-react';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'search', 'history'
  const [overview, setOverview] = useState(null);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [targetPlate, setTargetPlate] = useState('');

  const loadData = async () => {
    try {
      const [overviewData, spotsData] = await Promise.all([
        api.getOverview(),
        api.getSpots()
      ]);
      setOverview(overviewData);
      setSpots(spotsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching garage data:', err);
      setError('Failed to connect to backend server. Make sure MongoDB and backend on port 5000 are running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSpotClick = (spot) => {
    if (spot.isOccupied && spot.currentTicketId?.licensePlate) {
      setTargetPlate(spot.currentTicketId.licensePlate);
      setIsCheckOutOpen(true);
    } else {
      setIsCheckInOpen(true);
    }
  };

  const handleQuickCheckout = (plate) => {
    setTargetPlate(plate);
    setIsCheckOutOpen(true);
  };

  const handleQuickTransfer = (plate) => {
    setTargetPlate(plate);
    setIsTransferOpen(true);
  };

  return (
    <div className="app-container">
      <Header
        onOpenCheckIn={() => setIsCheckInOpen(true)}
        onOpenCheckOut={() => {
          setTargetPlate('');
          setIsCheckOutOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Level 2: Virtual Garage Clock & Automation Bar */}
      <ClockControl onClockAdvanced={loadData} />

      {error && (
        <div style={{
          background: 'var(--status-occ-bg)',
          border: '1px solid var(--status-occ-border)',
          color: '#fda4af',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button className="btn btn-secondary" onClick={loadData}>Retry</button>
        </div>
      )}

      {/* Top Overview Cards & EV Alert */}
      <OverviewStats summary={overview?.summary} />

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
          id="tab-map"
        >
          <Layers size={16} /> Live Floor Map
        </button>
        <button
          className={`nav-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          id="tab-search"
        >
          <Search size={16} /> Locate & Transfer
        </button>
        <button
          className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          id="tab-history"
        >
          <History size={16} /> Parking History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'map' && (
        <FloorMap
          spots={spots}
          levels={overview?.levels}
          onSelectSpot={handleSpotClick}
          onTransferPlate={handleQuickTransfer}
        />
      )}

      {activeTab === 'search' && (
        <VehicleSearch
          onQuickCheckOut={handleQuickCheckout}
          onQuickTransfer={handleQuickTransfer}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTable />
      )}

      {/* Modals */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onSuccess={loadData}
      />

      <CheckOutModal
        isOpen={isCheckOutOpen}
        initialPlate={targetPlate}
        onClose={() => {
          setIsCheckOutOpen(false);
          setTargetPlate('');
        }}
        onSuccess={loadData}
      />

      {/* Level 3: Valet Hand-off Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        initialPlate={targetPlate}
        onClose={() => {
          setIsTransferOpen(false);
          setTargetPlate('');
        }}
        onSuccess={loadData}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdated={loadData}
      />
    </div>
  );
}

const API_BASE = 'http://localhost:5000/api';
const ROOT_BASE = 'http://localhost:5000';

export const api = {
  async getOverview() {
    const res = await fetch(`${API_BASE}/garage/overview`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getSpots(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/spots${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async checkIn(data) {
    const res = await fetch(`${API_BASE}/tickets/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to check in');
    return result;
  },

  async checkOut(data) {
    const res = await fetch(`${API_BASE}/tickets/check-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to check out');
    return result;
  },

  // Level 3 Twist: Transfer session (Valet hand-off)
  async transferTicket(data) {
    const res = await fetch(`${API_BASE}/tickets/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to transfer ticket');
    return result;
  },

  async searchVehicle(plate) {
    const res = await fetch(`${API_BASE}/tickets/search?plate=${encodeURIComponent(plate)}`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || result.message || 'Vehicle not found');
    return result;
  },

  async getHistory(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/tickets/history${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getPricing() {
    const res = await fetch(`${API_BASE}/config/pricing`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updatePricing(pricing) {
    const res = await fetch(`${API_BASE}/config/pricing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pricing)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update pricing');
    return result;
  },

  // Level 1 Twist: Clean and import messy rate card
  async importMessyRates(rawData) {
    const res = await fetch(`${API_BASE}/config/pricing/import-messy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: rawData })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to import rate card');
    return result;
  },

  // Level 2 Twist: Clock & Nightly auto-close job
  async postClock(body = {}) {
    const res = await fetch(`${ROOT_BASE}/clock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update clock');
    return result;
  },

  async getClock() {
    const res = await fetch(`${ROOT_BASE}/clock`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async reseedGarage(layout) {
    const res = await fetch(`${API_BASE}/garage/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layout)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to seed garage');
    return result;
  }
};

const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runE2E() {
  console.log('--- Starting End-to-End API Integration Suite ---');

  // Reset/seed garage cleanly for test
  console.log('\n0. Resetting garage layout for test...');
  await request('/garage/seed', {
    method: 'POST',
    body: JSON.stringify({ levels: 3, compactPerLevel: 4, standardPerLevel: 4, evPerLevel: 2, resetTickets: true })
  });

  // 1. Garage Overview
  console.log('\n1. Fetching Garage Overview...');
  const overview = await request('/garage/overview');
  assert.strictEqual(overview.status, 200, 'Overview status should be 200');
  console.log(`✔ Overview fetched. Total Spots: ${overview.data.summary.totalSpots}, EV Spots: ${overview.data.summary.ev.total}`);

  // 2. Pricing Configuration Read & Update
  console.log('\n2. Testing Pricing Configuration...');
  const initialPricing = await request('/config/pricing');
  assert.strictEqual(initialPricing.status, 200);
  console.log(`✔ Current rates: 1st hr = $${initialPricing.data.firstHourRate}, addl = $${initialPricing.data.additionalHourRate}, cap = $${initialPricing.data.dailyCap}`);

  const updatePricingRes = await request('/config/pricing', {
    method: 'PUT',
    body: JSON.stringify({ firstHourRate: 12, additionalHourRate: 6, dailyCap: 45 })
  });
  assert.strictEqual(updatePricingRes.status, 200);
  assert.strictEqual(updatePricingRes.data.config.firstHourRate, 12);
  console.log('✔ Pricing updated to 1st hr = $12, addl = $6, cap = $45');

  // 3. Check-In EV Vehicle
  console.log('\n3. Checking in EV vehicle (EV-TEST-100)...');
  const evCheckIn = await request('/tickets/check-in', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'EV-TEST-100', vehicleType: 'EV' })
  });
  assert.strictEqual(evCheckIn.status, 201);
  assert.strictEqual(evCheckIn.data.assignedSpot.type, 'EV');
  console.log(`✔ EV vehicle assigned to spot ${evCheckIn.data.assignedSpot.spotNumber} (${evCheckIn.data.assignedSpot.type}) on Level ${evCheckIn.data.assignedSpot.level}`);

  // 4. Duplicate Check-In Prevention
  console.log('\n4. Verifying duplicate check-in rejection...');
  const dupCheckIn = await request('/tickets/check-in', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'EV-TEST-100', vehicleType: 'EV' })
  });
  assert.strictEqual(dupCheckIn.status, 400);
  console.log(`✔ Duplicate check-in correctly blocked: "${dupCheckIn.data.error}"`);

  // 5. Check-In Standard Vehicle
  console.log('\n5. Checking in Standard vehicle (STD-200)...');
  const stdCheckIn = await request('/tickets/check-in', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'STD-200', vehicleType: 'Standard' })
  });
  assert.strictEqual(stdCheckIn.status, 201);
  assert.strictEqual(stdCheckIn.data.assignedSpot.type, 'Standard');
  console.log(`✔ Standard vehicle assigned to spot ${stdCheckIn.data.assignedSpot.spotNumber} (${stdCheckIn.data.assignedSpot.type})`);

  // 6. Search Vehicle by License Plate
  console.log('\n6. Testing vehicle search by license plate...');
  const searchRes = await request('/tickets/search?plate=EV-TEST-100');
  assert.strictEqual(searchRes.status, 200);
  assert.strictEqual(searchRes.data.ticket.licensePlate, 'EV-TEST-100');
  console.log(`✔ Located EV-TEST-100 at Spot ${searchRes.data.ticket.spotNumber} (Level ${searchRes.data.ticket.level}). Estimated fee: $${searchRes.data.currentEstimate.accruedFee}`);

  // 7. Check-Out Vehicle
  console.log('\n7. Checking out EV vehicle & Standard vehicle...');
  const checkOutRes = await request('/tickets/check-out', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'EV-TEST-100' })
  });
  assert.strictEqual(checkOutRes.status, 200);
  assert.strictEqual(checkOutRes.data.receipt.licensePlate, 'EV-TEST-100');
  assert.strictEqual(checkOutRes.data.receipt.totalFee, 12); // 1 billed hour with updated 1st hour rate of $12
  console.log(`✔ EV-TEST-100 checked out. Billed hours: ${checkOutRes.data.receipt.billedHours}, Total fee: $${checkOutRes.data.receipt.totalFee}`);

  const checkOutStd = await request('/tickets/check-out', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'STD-200' })
  });
  assert.strictEqual(checkOutStd.status, 200);
  console.log(`✔ STD-200 checked out. Total fee: $${checkOutStd.data.receipt.totalFee}`);

  // 8. Parking History Verification
  console.log('\n8. Checking Parking History...');
  const historyRes = await request('/tickets/history');
  assert.strictEqual(historyRes.status, 200);
  const foundInHistory = historyRes.data.history.some(h => h.licensePlate === 'EV-TEST-100');
  assert.strictEqual(foundInHistory, true, 'Vehicle should appear in history');
  console.log(`✔ Verified EV-TEST-100 recorded in history (${historyRes.data.total} completed session(s))`);

  // 9. Reset pricing back to standard default
  await request('/config/pricing', {
    method: 'PUT',
    body: JSON.stringify({ firstHourRate: 10, additionalHourRate: 5, dailyCap: 40 })
  });
  console.log('✔ Restored default pricing rates ($10 / $5 / $40)');

  console.log('\n=== ALL END-TO-END SUITE CHECKS PASSED WITH 100% SUCCESS ===\n');
}

runE2E().catch(err => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});

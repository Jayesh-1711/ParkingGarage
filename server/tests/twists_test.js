const assert = require('assert');

const BASE_URL = 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTwistsTest() {
  console.log('========================================================');
  console.log('--- STARTING COMPREHENSIVE TWISTS TEST SUITE (L1, L2, L3) ---');
  console.log('========================================================\n');

  // Reset database & layout cleanly
  console.log('0. Resetting garage layout...');
  await request('/api/garage/seed', {
    method: 'POST',
    body: JSON.stringify({ levels: 2, compactPerLevel: 3, standardPerLevel: 3, evPerLevel: 2, resetTickets: true })
  });
  // Reset clock
  await request('/clock', { method: 'POST', body: JSON.stringify({ reset: true }) });
  console.log('✔ Garage & Clock reset.\n');

  // -------------------------------------------------------------
  // LEVEL 1: MESSY RATE CARD IMPORT & SPOT-TYPE PRICING
  // -------------------------------------------------------------
  console.log('--- LEVEL 1 (T4): MESSY DATA RATE CARD IMPORT ---');
  const messyRateCard = {
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
  };

  const importRes = await request('/api/config/pricing/import-messy', {
    method: 'POST',
    body: JSON.stringify({ raw: messyRateCard })
  });

  assert.strictEqual(importRes.status, 200, 'Import should succeed with status 200');
  const rates = importRes.data.cleanedRates.ratesBySpotType;
  console.log('✔ Messy Rate Card Successfully Cleaned:');
  console.log('   Compact  :', rates.Compact);
  console.log('   Standard :', rates.Standard);
  console.log('   EV       :', rates.EV);

  assert.strictEqual(rates.Compact.firstHourRate, 7.5);
  assert.strictEqual(rates.Compact.additionalHourRate, 3.5);
  assert.strictEqual(rates.Compact.dailyCap, 28);
  assert.strictEqual(rates.Standard.firstHourRate, 11);
  assert.strictEqual(rates.Standard.additionalHourRate, 5.5);
  assert.strictEqual(rates.Standard.dailyCap, 42);
  assert.strictEqual(rates.EV.firstHourRate, 14);
  assert.strictEqual(rates.EV.additionalHourRate, 7);
  assert.strictEqual(rates.EV.dailyCap, 55);

  // Check in Compact vehicle & EV vehicle for 1.5 hours (rounds up to 2 billed hours)
  const cIn1 = await request('/api/tickets/check-in', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'CMP-100', vehicleType: 'Compact', entryHoursAgo: 1.5 })
  });
  const cIn2 = await request('/api/tickets/check-in', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'EV-100', vehicleType: 'EV', entryHoursAgo: 1.5 })
  });

  const outC = await request('/api/tickets/check-out', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'CMP-100' })
  });
  const outEV = await request('/api/tickets/check-out', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'EV-100' })
  });

  assert.strictEqual(outC.data.receipt.billedHours, 2);
  assert.strictEqual(outC.data.receipt.totalFee, 11.0);
  assert.strictEqual(outEV.data.receipt.billedHours, 2);
  assert.strictEqual(outEV.data.receipt.totalFee, 21.0);
  console.log(`✔ Verified Spot-type pricing (2 billed hrs): Compact = $${outC.data.receipt.totalFee}, EV = $${outEV.data.receipt.totalFee}`);
  console.log('✔ LEVEL 1 (T4) PASSED 100%!\n');

  // -------------------------------------------------------------
  // LEVEL 2: AUTOMATION VIA POST /clock (NIGHTLY JOB AUTO-CLOSE > 24H)
  // -------------------------------------------------------------
  console.log('--- LEVEL 2 (T2): NIGHTLY AUTO-CLOSE JOB VIA POST /clock ---');
  const shortCar = await request('/api/tickets/check-in', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'SHORT-STAY', vehicleType: 'Standard', entryHoursAgo: 2 })
  });
  const longCar = await request('/api/tickets/check-in', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'OVERNIGHT-26H', vehicleType: 'Standard', entryHoursAgo: 26 })
  });

  assert.strictEqual(shortCar.status, 201);
  assert.strictEqual(longCar.status, 201);
  console.log(`✔ Checked in SHORT-STAY (2h ago) at ${shortCar.data.assignedSpot.spotNumber}`);
  console.log(`✔ Checked in OVERNIGHT-26H (26h ago) at ${longCar.data.assignedSpot.spotNumber}`);

  const clockRes = await request('/clock', {
    method: 'POST',
    body: JSON.stringify({})
  });

  assert.strictEqual(clockRes.status, 200);
  console.log(`✔ POST /clock executed. Auto-closed: ${clockRes.data.nightlyAutoCloseJob.sessionsAutoClosed} session(s)`);
  assert.strictEqual(clockRes.data.nightlyAutoCloseJob.sessionsAutoClosed, 1, 'Expected exactly 1 overdue session auto-closed');
  assert.strictEqual(clockRes.data.nightlyAutoCloseJob.autoClosedTickets[0].licensePlate, 'OVERNIGHT-26H');

  const overnightSpotNum = longCar.data.assignedSpot.spotNumber;
  const spotsRes = await request('/api/spots');
  const freedSpot = spotsRes.data.find(s => s.spotNumber === overnightSpotNum);
  assert.strictEqual(freedSpot.isOccupied, false, 'Auto-closed vehicle spot should be freed');
  console.log(`✔ Spot ${overnightSpotNum} verified FREED and available.`);

  const shortSearch = await request('/api/tickets/search?plate=SHORT-STAY');
  assert.strictEqual(shortSearch.status, 200);
  assert.strictEqual(shortSearch.data.ticket.status, 'ACTIVE');
  console.log('✔ SHORT-STAY remains ACTIVE and unaffected.');

  await request('/api/tickets/check-out', { method: 'POST', body: JSON.stringify({ licensePlate: 'SHORT-STAY' }) });
  console.log('✔ LEVEL 2 (T2) PASSED 100%!\n');

  // -------------------------------------------------------------
  // LEVEL 3: LIFECYCLE (VALET HAND-OFF TRANSFER)
  // -------------------------------------------------------------
  console.log('--- LEVEL 3 (T6): LIFECYCLE VALET HAND-OFF SESSION TRANSFER ---');
  const valetInitial = await request('/api/tickets/check-in', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'VALET-OLD', vehicleType: 'Standard', entryHoursAgo: 3 })
  });
  assert.strictEqual(valetInitial.status, 201);
  const originalSpot = valetInitial.data.assignedSpot.spotNumber;
  const originalLevel = valetInitial.data.assignedSpot.level;
  const originalEntryTime = valetInitial.data.ticket.entryTime;

  const transferRes = await request('/api/tickets/transfer', {
    method: 'POST',
    body: JSON.stringify({
      currentPlate: 'VALET-OLD',
      newPlate: 'VALET-NEW',
      notes: 'Customer transferred keys to Valet Driver #42'
    })
  });

  assert.strictEqual(transferRes.status, 200, 'Transfer should succeed');
  const transferredTicket = transferRes.data.ticket;
  console.log(`✔ Transfer response: "${transferRes.data.message}"`);
  assert.strictEqual(transferredTicket.licensePlate, 'VALET-NEW');
  assert.strictEqual(transferredTicket.spotNumber, originalSpot);
  assert.strictEqual(transferredTicket.level, originalLevel);
  assert.strictEqual(new Date(transferredTicket.entryTime).getTime(), new Date(originalEntryTime).getTime());

  const oldSearch = await request('/api/tickets/search?plate=VALET-OLD');
  assert.strictEqual(oldSearch.status, 404);
  console.log('✔ Search for VALET-OLD correctly returns 404 (transferred).');

  const newSearch = await request('/api/tickets/search?plate=VALET-NEW');
  assert.strictEqual(newSearch.status, 200);
  assert.strictEqual(newSearch.data.ticket.spotNumber, originalSpot);

  const valetOut = await request('/api/tickets/check-out', {
    method: 'POST',
    body: JSON.stringify({ licensePlate: 'VALET-NEW' })
  });
  assert.strictEqual(valetOut.status, 200);
  assert.strictEqual(valetOut.data.receipt.licensePlate, 'VALET-NEW');
  console.log(`✔ VALET-NEW checked out successfully. Total fee: $${valetOut.data.receipt.totalFee}`);
  console.log('✔ LEVEL 3 (T6) PASSED 100%!\n');

  // Cleanly restore default standard 3 levels layout and clock
  console.log('Restoring default 3 levels layout (30 spots)...');
  await request('/api/garage/seed', {
    method: 'POST',
    body: JSON.stringify({ levels: 3, compactPerLevel: 4, standardPerLevel: 4, evPerLevel: 2, resetTickets: true })
  });
  await request('/clock', { method: 'POST', body: JSON.stringify({ reset: true }) });
  console.log('✔ Default 3 levels (30 spots) restored.');

  console.log('========================================================');
  console.log(' ALL 3 TWIST LEVELS (L1, L2, L3) TESTED AND PASSED 100%! ');
  console.log('========================================================');
}

runTwistsTest().catch(err => {
  console.error('Twists Test Suite Failed:', err);
  process.exit(1);
});

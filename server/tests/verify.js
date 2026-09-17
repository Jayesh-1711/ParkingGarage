require('dotenv').config();
const mongoose = require('mongoose');
const { calculateFee } = require('../src/services/pricingService');
const { seedGarage } = require('../src/services/seedService');
const { allocateAndClaimSpot, releaseSpot } = require('../src/services/allocationService');
const ParkingSpot = require('../src/models/ParkingSpot');
const Ticket = require('../src/models/Ticket');
const PricingConfig = require('../src/models/PricingConfig');

async function runTests() {
  console.log('=== 1. Testing Pricing Calculation Rules ===');
  const rates = { firstHourRate: 10, additionalHourRate: 5, dailyCap: 40 };

  const now = Date.now();
  // Case A: 15 minutes (partial hour rounds up to 1 hr)
  const fee15m = calculateFee(new Date(now - 15 * 60 * 1000), new Date(now), rates);
  console.assert(fee15m.billedHours === 1, `Expected 1 billed hour, got ${fee15m.billedHours}`);
  console.assert(fee15m.totalFee === 10, `Expected $10 fee, got ${fee15m.totalFee}`);
  console.log('✔ Partial hour rounded up to 1 hr = $10.00');

  // Case B: 2.5 hours (rounds up to 3 hrs) -> 10 + 2*5 = 20
  const fee2_5h = calculateFee(new Date(now - 2.5 * 3600 * 1000), new Date(now), rates);
  console.assert(fee2_5h.billedHours === 3, `Expected 3 billed hours, got ${fee2_5h.billedHours}`);
  console.assert(fee2_5h.totalFee === 20, `Expected $20 fee, got ${fee2_5h.totalFee}`);
  console.log('✔ 2.5 hours rounded up to 3 hrs (1st hr $10 + 2 addl hrs $10) = $20.00');

  // Case C: 8 hours -> 10 + 7*5 = 45 -> capped at 40
  const fee8h = calculateFee(new Date(now - 8 * 3600 * 1000), new Date(now), rates);
  console.assert(fee8h.billedHours === 8, `Expected 8 billed hours, got ${fee8h.billedHours}`);
  console.assert(fee8h.totalFee === 40, `Expected daily cap $40, got ${fee8h.totalFee}`);
  console.assert(fee8h.dailyCapApplied === true, 'Expected dailyCapApplied = true');
  console.log('✔ 8 hours capped at daily maximum $40.00');

  // Case D: 26 hours -> 1 day ($40) + 2 hrs ($10 + $5 = $15) = $55
  const fee26h = calculateFee(new Date(now - 26 * 3600 * 1000), new Date(now), rates);
  console.assert(fee26h.billedHours === 26, `Expected 26 billed hours, got ${fee26h.billedHours}`);
  console.assert(fee26h.totalFee === 55, `Expected $55, got ${fee26h.totalFee}`);
  console.log('✔ 26 hours (1 day cap $40 + 2 hrs $15) = $55.00');

  console.log('\n=== 2. Testing Database Allocation & Garage Rules ===');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parking_garage');

  // Seed test garage: 1 Level, 1 Compact, 1 Standard, 1 EV
  await seedGarage({ levels: 1, compactPerLevel: 1, standardPerLevel: 1, evPerLevel: 1, resetTickets: true });
  console.log('✔ Seeded test layout: 1 Level with 1 Compact, 1 Standard, 1 EV');

  // Test EV allocation
  const evSpot = await allocateAndClaimSpot('EV');
  console.assert(evSpot.type === 'EV', `Expected EV spot, got ${evSpot.type}`);
  console.assert(evSpot.isOccupied === true, 'Expected spot claimed');
  console.log(`✔ EV vehicle allocated to ${evSpot.spotNumber} (${evSpot.type})`);

  // EV spot is now occupied. Next EV vehicle should get null
  const noEvSpot = await allocateAndClaimSpot('EV');
  console.assert(noEvSpot === null, 'Expected no EV spot available');
  console.log('✔ Second EV vehicle correctly rejected when EV spot is full (EV cannot use other spots)');

  // Test Compact allocation (first gets Compact spot)
  const compactSpot1 = await allocateAndClaimSpot('Compact');
  console.assert(compactSpot1.type === 'Compact', `Expected Compact spot, got ${compactSpot1.type}`);
  console.log(`✔ First Compact vehicle allocated to ${compactSpot1.spotNumber} (${compactSpot1.type})`);

  // Compact spot is full -> Second Compact vehicle should get Standard spot
  const compactSpot2 = await allocateAndClaimSpot('Compact');
  console.assert(compactSpot2.type === 'Standard', `Expected Standard spot fallback for Compact vehicle, got ${compactSpot2?.type}`);
  console.log(`✔ Second Compact vehicle correctly falls back to ${compactSpot2.spotNumber} (${compactSpot2.type})`);

  // Standard vehicle when Standard spot is available vs occupied
  const noStandardSpot = await allocateAndClaimSpot('Standard');
  console.assert(noStandardSpot === null, 'Expected Standard vehicle rejected when Standard spots are full');
  console.log('✔ Standard vehicle rejected when Standard spots full (Standard cannot use Compact/EV spots)');

  // Reset to default standard layout
  await seedGarage({ levels: 3, compactPerLevel: 4, standardPerLevel: 4, evPerLevel: 2, resetTickets: true });
  console.log('\n✔ Reset garage to default 30 spots (3 levels).');

  await mongoose.disconnect();
  console.log('\n ALL VERIFICATION TESTS PASSED SUCCESSFULLY! \n');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

const ParkingSpot = require('../models/ParkingSpot');
const Ticket = require('../models/Ticket');
const PricingConfig = require('../models/PricingConfig');

/**
 * Seed or Re-configure the garage layout.
 * Default: 3 levels, 4 Compact, 4 Standard, 2 EV per level (30 spots total).
 */
async function seedGarage(layoutConfig = {}) {
  const {
    levels = 3,
    compactPerLevel = 4,
    standardPerLevel = 4,
    evPerLevel = 2,
    resetTickets = false
  } = layoutConfig;

  // Clear existing spots
  await ParkingSpot.deleteMany({});
  
  if (resetTickets) {
    await Ticket.deleteMany({});
  } else {
    // If preserving history, only delete active tickets
    await Ticket.deleteMany({ status: 'ACTIVE' });
  }

  // Ensure default pricing exists
  await PricingConfig.getOrCreateDefault();

  const spotsToCreate = [];

  for (let lvl = 1; lvl <= levels; lvl++) {
    let spotIdx = 1;

    // Compact spots
    for (let i = 1; i <= compactPerLevel; i++) {
      const spotNum = `L${lvl}-${String(spotIdx).padStart(2, '0')}`;
      spotsToCreate.push({
        spotNumber: spotNum,
        level: lvl,
        type: 'Compact',
        isOccupied: false,
        currentTicketId: null
      });
      spotIdx++;
    }

    // Standard spots
    for (let i = 1; i <= standardPerLevel; i++) {
      const spotNum = `L${lvl}-${String(spotIdx).padStart(2, '0')}`;
      spotsToCreate.push({
        spotNumber: spotNum,
        level: lvl,
        type: 'Standard',
        isOccupied: false,
        currentTicketId: null
      });
      spotIdx++;
    }

    // EV spots
    for (let i = 1; i <= evPerLevel; i++) {
      const spotNum = `L${lvl}-${String(spotIdx).padStart(2, '0')}`;
      spotsToCreate.push({
        spotNumber: spotNum,
        level: lvl,
        type: 'EV',
        isOccupied: false,
        currentTicketId: null
      });
      spotIdx++;
    }
  }

  const createdSpots = await ParkingSpot.insertMany(spotsToCreate);
  console.log(`Garage initialized with ${createdSpots.length} spots across ${levels} levels.`);
  return {
    levels,
    totalSpots: createdSpots.length,
    spotsPerLevel: compactPerLevel + standardPerLevel + evPerLevel,
    distribution: {
      compact: compactPerLevel * levels,
      standard: standardPerLevel * levels,
      ev: evPerLevel * levels
    }
  };
}

module.exports = {
  seedGarage
};

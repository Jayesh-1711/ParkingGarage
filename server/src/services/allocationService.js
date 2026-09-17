const ParkingSpot = require('../models/ParkingSpot');

/**
 * Deterministically finds the candidate spot criteria.
 * 
 * Rules:
 * 1. Compact: Compact spot first; if none available, Standard spot.
 * 2. Standard: Standard spot only.
 * 3. EV: EV spot only.
 * 
 * Spot ordering: Lowest level first, then lowest spotNumber.
 */
async function allocateAndClaimSpot(vehicleType) {
  let eligibleTypes = [];

  if (vehicleType === 'Compact') {
    // 1. Try Compact spot first
    const compactSpots = await ParkingSpot.find({
      type: 'Compact',
      isOccupied: false
    }).sort({ level: 1, spotNumber: 1 });

    for (const spot of compactSpots) {
      // Atomic claim
      const claimed = await ParkingSpot.findOneAndUpdate(
        { _id: spot._id, isOccupied: false },
        { isOccupied: true },
        { new: true }
      );
      if (claimed) return claimed;
    }

    // 2. Fallback to Standard spot
    const standardSpots = await ParkingSpot.find({
      type: 'Standard',
      isOccupied: false
    }).sort({ level: 1, spotNumber: 1 });

    for (const spot of standardSpots) {
      const claimed = await ParkingSpot.findOneAndUpdate(
        { _id: spot._id, isOccupied: false },
        { isOccupied: true },
        { new: true }
      );
      if (claimed) return claimed;
    }

    return null;
  }

  if (vehicleType === 'Standard') {
    eligibleTypes = ['Standard'];
  } else if (vehicleType === 'EV') {
    eligibleTypes = ['EV'];
  } else {
    throw new Error(`Invalid vehicle type: ${vehicleType}`);
  }

  const spots = await ParkingSpot.find({
    type: { $in: eligibleTypes },
    isOccupied: false
  }).sort({ level: 1, spotNumber: 1 });

  for (const spot of spots) {
    const claimed = await ParkingSpot.findOneAndUpdate(
      { _id: spot._id, isOccupied: false },
      { isOccupied: true },
      { new: true }
    );
    if (claimed) return claimed;
  }

  return null;
}

/**
 * Release a previously claimed spot (used on error rollback).
 */
async function releaseSpot(spotId) {
  await ParkingSpot.findByIdAndUpdate(spotId, {
    isOccupied: false,
    currentTicketId: null
  });
}

module.exports = {
  allocateAndClaimSpot,
  releaseSpot
};

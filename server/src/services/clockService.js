const Ticket = require('../models/Ticket');
const ParkingSpot = require('../models/ParkingSpot');
const PricingConfig = require('../models/PricingConfig');
const { calculateFee } = require('./pricingService');
const { releaseSpot } = require('./allocationService');

let simulatedTimeOffsetMs = 0;
let isSimulationActive = false;

/**
 * Get current system/simulated time.
 */
function getNow() {
  if (isSimulationActive) {
    return new Date(Date.now() + simulatedTimeOffsetMs);
  }
  return new Date();
}

/**
 * Set simulated time.
 */
function setSimulatedTime(timeInput) {
  let targetMs;
  if (typeof timeInput === 'number') {
    targetMs = timeInput;
  } else if (typeof timeInput === 'string') {
    targetMs = new Date(timeInput).getTime();
  } else if (timeInput instanceof Date) {
    targetMs = timeInput.getTime();
  } else {
    throw new Error('Invalid time input');
  }

  if (isNaN(targetMs)) {
    throw new Error('Invalid date format');
  }

  simulatedTimeOffsetMs = targetMs - Date.now();
  isSimulationActive = true;
  return new Date(targetMs);
}

/**
 * Advance simulated time by N hours.
 */
function advanceTimeHours(hours = 1) {
  const currentNow = getNow();
  const advancedMs = currentNow.getTime() + (Number(hours) * 3600 * 1000);
  simulatedTimeOffsetMs = advancedMs - Date.now();
  isSimulationActive = true;
  return new Date(advancedMs);
}

/**
 * Reset to live clock time.
 */
function resetToLiveClock() {
  simulatedTimeOffsetMs = 0;
  isSimulationActive = false;
  return new Date();
}

/**
 * Nightly automation job:
 * Auto-closes and bills any active session parked over 24 hours.
 */
async function runNightlyAutoCloseJob(currentTime = getNow()) {
  const cutoffTime = new Date(currentTime.getTime() - (24 * 3600 * 1000));
  
  // Find all active tickets entered 24+ hours ago
  const overdueTickets = await Ticket.find({
    status: 'ACTIVE',
    entryTime: { $lte: cutoffTime }
  }).populate('spotId');

  const rates = await PricingConfig.getOrCreateDefault();
  const autoClosedResults = [];

  for (const ticket of overdueTickets) {
    const spotType = ticket.spotId?.type || ticket.vehicleType || 'Standard';
    const feeDetails = calculateFee(ticket.entryTime, currentTime, rates, spotType);

    ticket.status = 'COMPLETED';
    ticket.exitTime = currentTime;
    ticket.durationHours = feeDetails.billedHours;
    ticket.actualDuration = feeDetails.actualDurationFormatted;
    ticket.totalFee = feeDetails.totalFee;
    ticket.feeBreakdown = {
      firstHourFee: feeDetails.firstHourFee,
      additionalHoursFee: feeDetails.additionalHoursFee,
      dailyCapApplied: feeDetails.dailyCapApplied,
      billedHours: feeDetails.billedHours,
      actualDurationFormatted: feeDetails.actualDurationFormatted,
      rateSnapshot: {
        firstHourRate: feeDetails.rates.firstHourRate,
        additionalHourRate: feeDetails.rates.additionalHourRate,
        dailyCap: feeDetails.rates.dailyCap
      }
    };

    // Mark automation metadata
    ticket.autoClosed = true;
    ticket.autoCloseReason = 'NIGHTLY_AUTO_CLOSE_OVER_24H';

    await ticket.save();

    // Release parking stall
    await releaseSpot(ticket.spotId);

    autoClosedResults.push({
      ticketNumber: ticket.ticketNumber,
      licensePlate: ticket.licensePlate,
      spotNumber: ticket.spotNumber,
      level: ticket.level,
      entryTime: ticket.entryTime,
      exitTime: currentTime,
      billedHours: feeDetails.billedHours,
      totalFee: feeDetails.totalFee
    });
  }

  return {
    simulatedTime: currentTime,
    overdueFound: overdueTickets.length,
    autoClosedCount: autoClosedResults.length,
    totalBilled: autoClosedResults.reduce((acc, t) => acc + t.totalFee, 0),
    autoClosedTickets: autoClosedResults
  };
}

module.exports = {
  getNow,
  setSimulatedTime,
  advanceTimeHours,
  resetToLiveClock,
  runNightlyAutoCloseJob
};

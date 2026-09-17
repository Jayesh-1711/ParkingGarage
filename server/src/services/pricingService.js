/**
 * Format duration in milliseconds into human readable text
 */
function formatDuration(durationMs) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || (hours === 0 && days === 0)) parts.push(`${minutes}m`);
  if (days === 0 && hours === 0 && minutes === 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
}

/**
 * Calculate parking fee based on entry and exit times and configurable rates.
 * Supports per-spot-type rates (Compact, Standard, EV).
 */
function calculateFee(entryTime, exitTime, rates, spotType = 'Standard') {
  // If rates has ratesBySpotType, use that spot type's rates
  let tier = rates;
  if (rates.ratesBySpotType && rates.ratesBySpotType[spotType]) {
    tier = rates.ratesBySpotType[spotType];
  }

  const firstHourRate = tier.firstHourRate !== undefined ? tier.firstHourRate : (rates.firstHourRate || 10);
  const additionalHourRate = tier.additionalHourRate !== undefined ? tier.additionalHourRate : (rates.additionalHourRate || 5);
  const dailyCap = tier.dailyCap !== undefined ? tier.dailyCap : (rates.dailyCap || 40);

  const startMs = new Date(entryTime).getTime();
  const endMs = new Date(exitTime).getTime();
  const durationMs = Math.max(0, endMs - startMs);

  // Partial hours round up. If 0ms elapsed, minimum billed is 1 hour
  const billedHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));

  const fullDays = Math.floor(billedHours / 24);
  const remHours = billedHours % 24;

  let remCost = 0;
  let firstHourPortion = 0;
  let additionalHoursPortion = 0;

  if (remHours === 1) {
    remCost = firstHourRate;
    firstHourPortion = firstHourRate;
  } else if (remHours > 1) {
    firstHourPortion = firstHourRate;
    additionalHoursPortion = (remHours - 1) * additionalHourRate;
    remCost = firstHourPortion + additionalHoursPortion;
  }

  const dailyCapApplied = remCost > dailyCap;
  const cappedRemCost = Math.min(remCost, dailyCap);
  const totalFee = Number(((fullDays * dailyCap) + cappedRemCost).toFixed(2));

  return {
    durationMs,
    actualDurationFormatted: formatDuration(durationMs),
    billedHours,
    fullDays,
    remHours,
    dailyCapApplied,
    firstHourFee: fullDays > 0 && remHours === 0 ? 0 : firstHourPortion,
    additionalHoursFee: additionalHoursPortion,
    totalFee,
    spotType,
    rates: {
      firstHourRate,
      additionalHourRate,
      dailyCap
    }
  };
}

module.exports = {
  calculateFee,
  formatDuration
};

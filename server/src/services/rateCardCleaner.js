/**
 * Service to clean and parse messy / dirty rate card inputs.
 * 
 * Handles:
 * - Currency symbols ($, USD, €, etc.)
 * - Strings with junk text, spaces, commas, slashes (e.g. " $15.50 / hr ", "USD 8.00 bucks", "50 per day")
 * - Irregular key names (e.g. compact_first_hour, std-addl, ev-daily-cap, 1st_hour, FIRST_HR, etc.)
 * - Per-spot-type rate cards (Compact, Standard, EV) or flat universal rate card.
 */

function extractNumber(val, defaultVal = 0) {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  if (typeof val !== 'string') return defaultVal;

  // Extract first floating point / integer number from string
  const cleaned = val.replace(/,/g, '').trim();
  const match = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!match) return defaultVal;
  const num = parseFloat(match[0]);
  return isNaN(num) ? defaultVal : num;
}

/**
 * Parses messy rate card payload (can be JSON object, nested object, flat object, or raw text)
 */
function cleanRateCard(rawInput) {
  let parsed = rawInput;

  // If raw string / text provided, try parsing JSON or line-by-line key-value pairs
  if (typeof rawInput === 'string') {
    const trimmed = rawInput.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        parsed = parseLineByLineText(trimmed);
      }
    } else {
      parsed = parseLineByLineText(trimmed);
    }
  }

  const result = {
    firstHourRate: 10,
    additionalHourRate: 5,
    dailyCap: 40,
    ratesBySpotType: {
      Compact: { firstHourRate: 8, additionalHourRate: 4, dailyCap: 35 },
      Standard: { firstHourRate: 10, additionalHourRate: 5, dailyCap: 40 },
      EV: { firstHourRate: 12, additionalHourRate: 6, dailyCap: 50 }
    }
  };

  if (!parsed || typeof parsed !== 'object') {
    return result;
  }

  // Helper to match key patterns
  const findVal = (obj, patterns) => {
    if (!obj || typeof obj !== 'object') return null;
    const keys = Object.keys(obj);
    for (const pat of patterns) {
      const foundKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(pat));
      if (foundKey && obj[foundKey] !== undefined) {
        return extractNumber(obj[foundKey]);
      }
    }
    return null;
  };

  // 1. Check if parsed has explicit spot types (e.g. parsed.Compact, parsed.ev, parsed.standard)
  const spotTypes = ['Compact', 'Standard', 'EV'];
  const keys = Object.keys(parsed);

  spotTypes.forEach(type => {
    const matchingKey = keys.find(k => k.toLowerCase().includes(type.toLowerCase()));
    if (matchingKey && typeof parsed[matchingKey] === 'object' && parsed[matchingKey] !== null) {
      const sub = parsed[matchingKey];
      const f = findVal(sub, ['first', '1st', 'initial', 'start']);
      const a = findVal(sub, ['add', 'extra', 'subsequent', 'after', 'hour']);
      const d = findVal(sub, ['cap', 'day', 'daily', 'max', '24h']);

      if (f !== null) result.ratesBySpotType[type].firstHourRate = f;
      if (a !== null) result.ratesBySpotType[type].additionalHourRate = a;
      if (d !== null) result.ratesBySpotType[type].dailyCap = d;
    }
  });

  // 2. Check for flat keys (e.g. "compact_first_hour", "ev_daily_cap", "standard_addl_rate", "firstHourRate", etc.)
  keys.forEach(k => {
    const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const val = extractNumber(parsed[k]);

    spotTypes.forEach(type => {
      const tLower = type.toLowerCase();
      if (lower.includes(tLower)) {
        if (lower.includes('first') || lower.includes('1st') || lower.includes('initial')) {
          result.ratesBySpotType[type].firstHourRate = val;
        } else if (lower.includes('add') || lower.includes('extra') || lower.includes('subsequent')) {
          result.ratesBySpotType[type].additionalHourRate = val;
        } else if (lower.includes('cap') || lower.includes('day') || lower.includes('daily') || lower.includes('max')) {
          result.ratesBySpotType[type].dailyCap = val;
        }
      }
    });

    // Global / fallback keys
    if ((lower.includes('first') || lower.includes('1st')) && !lower.includes('compact') && !lower.includes('ev') && !lower.includes('standard')) {
      result.firstHourRate = val;
    } else if ((lower.includes('add') || lower.includes('extra')) && !lower.includes('compact') && !lower.includes('ev') && !lower.includes('standard')) {
      result.additionalHourRate = val;
    } else if ((lower.includes('cap') || lower.includes('daily')) && !lower.includes('compact') && !lower.includes('ev') && !lower.includes('standard')) {
      result.dailyCap = val;
    }
  });

  // Keep global rates synced with Standard rates by default
  if (result.ratesBySpotType.Standard) {
    result.firstHourRate = result.ratesBySpotType.Standard.firstHourRate;
    result.additionalHourRate = result.ratesBySpotType.Standard.additionalHourRate;
    result.dailyCap = result.ratesBySpotType.Standard.dailyCap;
  }

  return result;
}

function parseLineByLineText(text) {
  const result = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const parts = line.split(/[:=]/);
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim();
      result[key] = val;
    }
  }
  return result;
}

module.exports = {
  cleanRateCard,
  extractNumber
};

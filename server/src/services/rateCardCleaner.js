/**
 * Service to clean and parse messy / dirty rate card inputs.
 * 
 * Handles:
 * - Currency symbols ($, USD, €, etc.)
 * - Strings with junk text, spaces, commas, slashes (e.g. " $15.50 / hr ", "USD 8.00 bucks", "50 per day")
 * - Irregular key names (e.g. compact_first_hour, std-addl, ev-daily-cap, 1st_hour, FIRST_HR, etc.)
 * - CSV lines, JSON objects, nested objects, and raw text
 * - Per-spot-type rate cards (Compact, Standard, EV) or flat universal rate card.
 */

function extractNumber(val, defaultVal = 0) {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  if (typeof val !== 'string') return defaultVal;

  const cleaned = val.replace(/,/g, '').trim();
  const match = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!match) return defaultVal;
  const num = parseFloat(match[0]);
  return isNaN(num) ? defaultVal : num;
}

/**
 * Parses messy rate card payload (can be JSON object, nested object, flat object, CSV, or raw text)
 */
function cleanRateCard(rawInput) {
  let parsed = rawInput;

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

  const spotTypes = ['Compact', 'Standard', 'EV'];
  const keys = Object.keys(parsed);

  // 1. Check nested spot type objects
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

  // 2. Check flat keys
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

    // Global keys
    if ((lower.includes('first') || lower.includes('1st')) && !lower.includes('compact') && !lower.includes('ev') && !lower.includes('standard')) {
      result.firstHourRate = val;
    } else if ((lower.includes('add') || lower.includes('extra')) && !lower.includes('compact') && !lower.includes('ev') && !lower.includes('standard')) {
      result.additionalHourRate = val;
    } else if ((lower.includes('cap') || lower.includes('daily')) && !lower.includes('compact') && !lower.includes('ev') && !lower.includes('standard')) {
      result.dailyCap = val;
    }
  });

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
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Support CSV: "Compact, $8.00, $4.00, $35.00"
    if (trimmed.includes(',')) {
      const cols = trimmed.split(',').map(c => c.trim());
      if (cols.length >= 4) {
        const spotName = cols[0];
        result[`${spotName}_first_hour`] = cols[1];
        result[`${spotName}_additional_hour`] = cols[2];
        result[`${spotName}_daily_cap`] = cols[3];
        continue;
      }
    }

    // Support Key-Value: "Compact 1st hr : $8.00"
    const parts = trimmed.split(/[:=]/);
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

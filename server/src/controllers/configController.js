const PricingConfig = require('../models/PricingConfig');
const { cleanRateCard } = require('../services/rateCardCleaner');

/**
 * Get current pricing configuration.
 */
exports.getPricing = async (req, res) => {
  try {
    const config = await PricingConfig.getOrCreateDefault();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update pricing configuration rates.
 */
exports.updatePricing = async (req, res) => {
  try {
    const { firstHourRate, additionalHourRate, dailyCap, ratesBySpotType } = req.body;

    let config = await PricingConfig.findOne();
    if (!config) {
      config = new PricingConfig();
    }

    if (firstHourRate !== undefined) config.firstHourRate = Number(firstHourRate);
    if (additionalHourRate !== undefined) config.additionalHourRate = Number(additionalHourRate);
    if (dailyCap !== undefined) config.dailyCap = Number(dailyCap);

    if (ratesBySpotType && typeof ratesBySpotType === 'object') {
      config.ratesBySpotType = {
        Compact: {
          firstHourRate: Number(ratesBySpotType.Compact?.firstHourRate ?? config.firstHourRate),
          additionalHourRate: Number(ratesBySpotType.Compact?.additionalHourRate ?? config.additionalHourRate),
          dailyCap: Number(ratesBySpotType.Compact?.dailyCap ?? config.dailyCap)
        },
        Standard: {
          firstHourRate: Number(ratesBySpotType.Standard?.firstHourRate ?? config.firstHourRate),
          additionalHourRate: Number(ratesBySpotType.Standard?.additionalHourRate ?? config.additionalHourRate),
          dailyCap: Number(ratesBySpotType.Standard?.dailyCap ?? config.dailyCap)
        },
        EV: {
          firstHourRate: Number(ratesBySpotType.EV?.firstHourRate ?? config.firstHourRate),
          additionalHourRate: Number(ratesBySpotType.EV?.additionalHourRate ?? config.additionalHourRate),
          dailyCap: Number(ratesBySpotType.EV?.dailyCap ?? config.dailyCap)
        }
      };
    } else {
      // If setting global rates without explicit per-spot tiers, update all tiers
      config.ratesBySpotType = {
        Compact: { firstHourRate: config.firstHourRate, additionalHourRate: config.additionalHourRate, dailyCap: config.dailyCap },
        Standard: { firstHourRate: config.firstHourRate, additionalHourRate: config.additionalHourRate, dailyCap: config.dailyCap },
        EV: { firstHourRate: config.firstHourRate, additionalHourRate: config.additionalHourRate, dailyCap: config.dailyCap }
      };
    }

    await config.save();

    res.json({
      message: 'Pricing configuration updated successfully',
      config
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Level 1 Twist: Import and clean a messy/dirty rate card payload.
 * Accepts raw strings with currency symbols/noise or dirty JSON/objects.
 */
exports.importMessyRates = async (req, res) => {
  try {
    const rawData = req.body?.raw || req.body?.rateCard || req.body;

    if (!rawData) {
      return res.status(400).json({ error: 'Please provide rate card data (e.g. raw text or object).' });
    }

    // Clean and normalize the messy rate card
    const cleaned = cleanRateCard(rawData);

    let config = await PricingConfig.findOne();
    if (!config) {
      config = new PricingConfig();
    }

    config.firstHourRate = cleaned.firstHourRate;
    config.additionalHourRate = cleaned.additionalHourRate;
    config.dailyCap = cleaned.dailyCap;
    config.ratesBySpotType = cleaned.ratesBySpotType;

    await config.save();

    res.json({
      message: 'Messy rate card imported, cleaned, and applied successfully!',
      cleanedRates: cleaned,
      config
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

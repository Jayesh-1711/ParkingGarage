const mongoose = require('mongoose');

const rateTierSchema = new mongoose.Schema(
  {
    firstHourRate: { type: Number, required: true, default: 10.0, min: 0 },
    additionalHourRate: { type: Number, required: true, default: 5.0, min: 0 },
    dailyCap: { type: Number, required: true, default: 40.0, min: 0 }
  },
  { _id: false }
);

const pricingConfigSchema = new mongoose.Schema(
  {
    firstHourRate: {
      type: Number,
      required: true,
      default: 10.0,
      min: 0
    },
    additionalHourRate: {
      type: Number,
      required: true,
      default: 5.0,
      min: 0
    },
    dailyCap: {
      type: Number,
      required: true,
      default: 40.0,
      min: 0
    },
    ratesBySpotType: {
      Compact: {
        type: rateTierSchema,
        default: () => ({ firstHourRate: 8.0, additionalHourRate: 4.0, dailyCap: 35.0 })
      },
      Standard: {
        type: rateTierSchema,
        default: () => ({ firstHourRate: 10.0, additionalHourRate: 5.0, dailyCap: 40.0 })
      },
      EV: {
        type: rateTierSchema,
        default: () => ({ firstHourRate: 12.0, additionalHourRate: 6.0, dailyCap: 50.0 })
      }
    }
  },
  {
    timestamps: true
  }
);

// Helper to ensure singleton configuration
pricingConfigSchema.statics.getOrCreateDefault = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      firstHourRate: 10.0,
      additionalHourRate: 5.0,
      dailyCap: 40.0,
      ratesBySpotType: {
        Compact: { firstHourRate: 8.0, additionalHourRate: 4.0, dailyCap: 35.0 },
        Standard: { firstHourRate: 10.0, additionalHourRate: 5.0, dailyCap: 40.0 },
        EV: { firstHourRate: 12.0, additionalHourRate: 6.0, dailyCap: 50.0 }
      }
    });
  }
  return config;
};

module.exports = mongoose.model('PricingConfig', pricingConfigSchema);

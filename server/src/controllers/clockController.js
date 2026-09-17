const clockService = require('../services/clockService');

/**
 * Handle POST /clock or POST /api/clock
 * Robust input parsing:
 * - Body or Query: { now, timestamp, iso, date, time, clock, advanceHours, reset }
 */
exports.handleClock = async (req, res) => {
  try {
    const payload = { ...req.query, ...req.body };
    const { now, timestamp, iso, date, time, clock, advanceHours, advanceHoursBy, reset } = payload;

    let currentSimulatedTime;

    if (reset === true || reset === 'true') {
      currentSimulatedTime = clockService.resetToLiveClock();
    } else if (advanceHours !== undefined || advanceHoursBy !== undefined) {
      const hrs = Number(advanceHours !== undefined ? advanceHours : advanceHoursBy);
      currentSimulatedTime = clockService.advanceTimeHours(isNaN(hrs) ? 1 : hrs);
    } else if (now || timestamp || iso || date || time || clock) {
      const timeInput = now || timestamp || iso || date || time || clock;
      currentSimulatedTime = clockService.setSimulatedTime(timeInput);
    } else {
      currentSimulatedTime = clockService.getNow();
    }

    // Run nightly auto-close job for any session parked over 24h
    const jobResult = await clockService.runNightlyAutoCloseJob(currentSimulatedTime);

    res.json({
      status: 'OK',
      simulatedTime: currentSimulatedTime.toISOString(),
      nightlyAutoCloseJob: {
        overdueChecked: jobResult.overdueFound,
        sessionsAutoClosed: jobResult.autoClosedCount,
        totalBilled: jobResult.totalBilled,
        autoClosedTickets: jobResult.autoClosedTickets
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /clock or GET /api/clock: Return current simulated clock time
 */
exports.getClock = (req, res) => {
  const current = clockService.getNow();
  res.json({
    simulatedTime: current.toISOString(),
    timestamp: current.getTime()
  });
};

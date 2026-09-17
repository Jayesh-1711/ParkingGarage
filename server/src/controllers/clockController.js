const clockService = require('../services/clockService');

/**
 * Handle POST /clock or POST /api/clock
 * Supports:
 * - Body: { now: "2026-09-18T10:00:00Z" } (or timestamp/date)
 * - Body: { advanceHours: 24 }
 * - Body: { reset: true }
 * - No body: executes nightly auto-close job at current simulated time
 */
exports.handleClock = async (req, res) => {
  try {
    const { now, timestamp, iso, advanceHours, reset } = req.body || {};

    let currentSimulatedTime;

    if (reset === true) {
      currentSimulatedTime = clockService.resetToLiveClock();
    } else if (advanceHours !== undefined) {
      currentSimulatedTime = clockService.advanceTimeHours(Number(advanceHours));
    } else if (now || timestamp || iso) {
      const timeInput = now || timestamp || iso;
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
 * GET /api/clock: Return current simulated clock time
 */
exports.getClock = (req, res) => {
  const current = clockService.getNow();
  res.json({
    simulatedTime: current.toISOString(),
    timestamp: current.getTime()
  });
};

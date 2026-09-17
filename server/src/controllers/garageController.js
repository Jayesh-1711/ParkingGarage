const ParkingSpot = require('../models/ParkingSpot');
const Ticket = require('../models/Ticket');
const { seedGarage } = require('../services/seedService');

/**
 * Get overall garage overview statistics, per-level breakdowns, and live layout structure.
 */
exports.getOverview = async (req, res) => {
  try {
    const spots = await ParkingSpot.find({}).sort({ level: 1, spotNumber: 1 });
    
    // Auto-seed default 3 levels if database is fresh/empty
    if (spots.length === 0) {
      await seedGarage({ levels: 3, compactPerLevel: 4, standardPerLevel: 4, evPerLevel: 2 });
      return exports.getOverview(req, res);
    }

    const totalSpots = spots.length;
    const occupiedSpots = spots.filter(s => s.isOccupied).length;
    const availableSpots = totalSpots - occupiedSpots;

    // EV specific stats
    const evSpots = spots.filter(s => s.type === 'EV');
    const totalEV = evSpots.length;
    const occupiedEV = evSpots.filter(s => s.isOccupied).length;
    const availableEV = totalEV - occupiedEV;

    // Compact and Standard stats
    const compactSpots = spots.filter(s => s.type === 'Compact');
    const standardSpots = spots.filter(s => s.type === 'Standard');

    // Per-level breakdown
    const levelsMap = {};
    spots.forEach(s => {
      if (!levelsMap[s.level]) {
        levelsMap[s.level] = {
          level: s.level,
          total: 0,
          occupied: 0,
          available: 0,
          compact: { total: 0, occupied: 0, available: 0 },
          standard: { total: 0, occupied: 0, available: 0 },
          ev: { total: 0, occupied: 0, available: 0 }
        };
      }
      levelsMap[s.level].total++;
      if (s.isOccupied) levelsMap[s.level].occupied++;
      else levelsMap[s.level].available++;

      const typeKey = s.type.toLowerCase();
      if (levelsMap[s.level][typeKey]) {
        levelsMap[s.level][typeKey].total++;
        if (s.isOccupied) levelsMap[s.level][typeKey].occupied++;
        else levelsMap[s.level][typeKey].available++;
      }
    });

    const activeTicketsCount = await Ticket.countDocuments({ status: 'ACTIVE' });
    const totalCompletedTickets = await Ticket.countDocuments({ status: 'COMPLETED' });

    const uniqueLevels = Object.keys(levelsMap).length || 1;
    const sampleLevel = levelsMap[1] || Object.values(levelsMap)[0] || {};
    const compactPerLvl = sampleLevel.compact ? sampleLevel.compact.total : Math.round(compactSpots.length / uniqueLevels);
    const standardPerLvl = sampleLevel.standard ? sampleLevel.standard.total : Math.round(standardSpots.length / uniqueLevels);
    const evPerLvl = sampleLevel.ev ? sampleLevel.ev.total : Math.round(totalEV / uniqueLevels);

    res.json({
      summary: {
        totalSpots,
        occupiedSpots,
        availableSpots,
        occupancyRate: totalSpots > 0 ? Number(((occupiedSpots / totalSpots) * 100).toFixed(1)) : 0,
        ev: {
          total: totalEV,
          occupied: occupiedEV,
          available: availableEV
        },
        compact: {
          total: compactSpots.length,
          occupied: compactSpots.filter(s => s.isOccupied).length,
          available: compactSpots.filter(s => !s.isOccupied).length
        },
        standard: {
          total: standardSpots.length,
          occupied: standardSpots.filter(s => s.isOccupied).length,
          available: standardSpots.filter(s => !s.isOccupied).length
        },
        activeVehicles: activeTicketsCount,
        completedSessions: totalCompletedTickets
      },
      levels: Object.values(levelsMap).sort((a, b) => a.level - b.level),
      currentLayout: {
        levels: uniqueLevels,
        compactPerLevel: compactPerLvl,
        standardPerLevel: standardPerLvl,
        evPerLevel: evPerLvl,
        totalSpots
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get full list of spots, optionally filtered by level or type.
 */
exports.getSpots = async (req, res) => {
  try {
    const { level, type, isOccupied } = req.query;
    const filter = {};
    if (level) filter.level = Number(level);
    if (type) filter.type = type;
    if (isOccupied !== undefined) filter.isOccupied = isOccupied === 'true';

    const spots = await ParkingSpot.find(filter)
      .populate('currentTicketId', 'ticketNumber licensePlate vehicleType entryTime')
      .sort({ level: 1, spotNumber: 1 });

    res.json(spots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Re-seed/configure garage layout.
 */
exports.reseedGarage = async (req, res) => {
  try {
    const { levels, compactPerLevel, standardPerLevel, evPerLevel, resetTickets } = req.body;
    const result = await seedGarage({
      levels: Number(levels) || 3,
      compactPerLevel: Number(compactPerLevel) || 4,
      standardPerLevel: Number(standardPerLevel) || 4,
      evPerLevel: Number(evPerLevel) || 2,
      resetTickets: resetTickets === true
    });
    res.json({ message: 'Garage layout configured successfully', ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

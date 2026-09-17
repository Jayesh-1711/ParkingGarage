const ParkingSpot = require('../models/ParkingSpot');
const Ticket = require('../models/Ticket');
const PricingConfig = require('../models/PricingConfig');
const { allocateAndClaimSpot, releaseSpot } = require('../services/allocationService');
const { calculateFee, formatDuration } = require('../services/pricingService');
const { getNow } = require('../services/clockService');

/**
 * Check-in a vehicle and atomically allocate an eligible parking spot.
 */
exports.checkIn = async (req, res) => {
  let claimedSpot = null;
  try {
    const { licensePlate, vehicleType, customEntryTime, entryHoursAgo } = req.body;

    if (!licensePlate || !vehicleType) {
      return res.status(400).json({ error: 'License plate and vehicle type are required.' });
    }

    const cleanPlate = licensePlate.trim().toUpperCase();
    const validTypes = ['Compact', 'Standard', 'EV'];
    if (!validTypes.includes(vehicleType)) {
      return res.status(400).json({ error: `Invalid vehicle type. Allowed: ${validTypes.join(', ')}` });
    }

    // Check if this vehicle is already parked inside
    const existingActiveTicket = await Ticket.findOne({
      licensePlate: cleanPlate,
      status: 'ACTIVE'
    });

    if (existingActiveTicket) {
      return res.status(400).json({
        error: `Vehicle with license plate '${cleanPlate}' is already parked at Spot ${existingActiveTicket.spotNumber} (Level ${existingActiveTicket.level}).`
      });
    }

    // Determine entry time based on clock service or custom simulation input
    let entryTime = getNow();
    if (customEntryTime) {
      const parsed = new Date(customEntryTime);
      if (!isNaN(parsed.getTime())) entryTime = parsed;
    } else if (entryHoursAgo && !isNaN(Number(entryHoursAgo))) {
      entryTime = new Date(entryTime.getTime() - Number(entryHoursAgo) * 3600 * 1000);
    }

    // Atomically claim eligible spot based on business rules
    claimedSpot = await allocateAndClaimSpot(vehicleType);

    if (!claimedSpot) {
      return res.status(400).json({
        error: `No available parking spot found for vehicle type '${vehicleType}'. Garage is full for this type.`
      });
    }

    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket = new Ticket({
      ticketNumber,
      licensePlate: cleanPlate,
      vehicleType,
      spotId: claimedSpot._id,
      spotNumber: claimedSpot.spotNumber,
      level: claimedSpot.level,
      entryTime,
      status: 'ACTIVE'
    });

    await newTicket.save();

    // Link ticket to spot
    claimedSpot.currentTicketId = newTicket._id;
    await claimedSpot.save();

    res.status(201).json({
      message: 'Vehicle checked in successfully',
      ticket: newTicket,
      assignedSpot: {
        spotNumber: claimedSpot.spotNumber,
        level: claimedSpot.level,
        type: claimedSpot.type
      }
    });
  } catch (error) {
    if (claimedSpot) {
      await releaseSpot(claimedSpot._id);
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Check-out a vehicle, calculate parking fee, and release the spot.
 */
exports.checkOut = async (req, res) => {
  try {
    const { licensePlate, ticketNumber, customExitTime } = req.body;

    if (!licensePlate && !ticketNumber) {
      return res.status(400).json({ error: 'Please provide either licensePlate or ticketNumber to check out.' });
    }

    const query = { status: 'ACTIVE' };
    if (ticketNumber) {
      query.ticketNumber = ticketNumber.trim();
    } else if (licensePlate) {
      query.licensePlate = licensePlate.trim().toUpperCase();
    }

    const ticket = await Ticket.findOne(query).populate('spotId');

    if (!ticket) {
      return res.status(404).json({ error: 'No active parking session found matching the provided details.' });
    }

    const rates = await PricingConfig.getOrCreateDefault();
    let exitTime = getNow();
    if (customExitTime) {
      const parsed = new Date(customExitTime);
      if (!isNaN(parsed.getTime())) exitTime = parsed;
    }

    if (exitTime.getTime() < ticket.entryTime.getTime()) {
      exitTime = new Date(ticket.entryTime.getTime() + 1000);
    }

    const spotType = ticket.spotId?.type || ticket.vehicleType || 'Standard';
    const feeDetails = calculateFee(ticket.entryTime, exitTime, rates, spotType);

    // Update ticket
    ticket.exitTime = exitTime;
    ticket.status = 'COMPLETED';
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

    await ticket.save();

    // Release spot
    await releaseSpot(ticket.spotId);

    res.json({
      message: 'Vehicle checked out successfully',
      receipt: {
        ticketNumber: ticket.ticketNumber,
        licensePlate: ticket.licensePlate,
        vehicleType: ticket.vehicleType,
        spotNumber: ticket.spotNumber,
        level: ticket.level,
        entryTime: ticket.entryTime,
        exitTime: ticket.exitTime,
        actualDuration: feeDetails.actualDurationFormatted,
        billedHours: feeDetails.billedHours,
        totalFee: feeDetails.totalFee,
        feeBreakdown: ticket.feeBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Level 3 Twist: Transfer an open session to a different plate (valet hand-off).
 * Spot and entry time carry over unchanged.
 */
exports.transferTicket = async (req, res) => {
  try {
    const { currentPlate, ticketNumber, newPlate, notes = 'Valet hand-off' } = req.body;

    if (!newPlate || (!currentPlate && !ticketNumber)) {
      return res.status(400).json({
        error: 'Please provide currentPlate (or ticketNumber) and the newPlate to transfer to.'
      });
    }

    const cleanNewPlate = newPlate.trim().toUpperCase();

    // Verify new plate isn't already inside the garage
    const existingActive = await Ticket.findOne({
      licensePlate: cleanNewPlate,
      status: 'ACTIVE'
    });

    if (existingActive) {
      return res.status(400).json({
        error: `Cannot transfer: Target license plate '${cleanNewPlate}' is already parked in an active session (Spot ${existingActive.spotNumber}).`
      });
    }

    const query = { status: 'ACTIVE' };
    if (ticketNumber) {
      query.ticketNumber = ticketNumber.trim();
    } else if (currentPlate) {
      query.licensePlate = currentPlate.trim().toUpperCase();
    }

    const ticket = await Ticket.findOne(query);

    if (!ticket) {
      return res.status(404).json({ error: 'No active parking session found for the specified vehicle/ticket.' });
    }

    const previousPlate = ticket.licensePlate;

    if (previousPlate === cleanNewPlate) {
      return res.status(400).json({ error: 'New license plate cannot be identical to the current license plate.' });
    }

    // Record transfer in audit history
    if (!ticket.transferHistory) {
      ticket.transferHistory = [];
    }

    ticket.transferHistory.push({
      fromPlate: previousPlate,
      toPlate: cleanNewPlate,
      transferredAt: getNow(),
      notes
    });

    // Reassign plate (spot, level, and original entry time carry over unchanged)
    ticket.licensePlate = cleanNewPlate;
    await ticket.save();

    res.json({
      message: `Session transferred successfully from '${previousPlate}' to '${cleanNewPlate}'`,
      ticket: {
        ticketNumber: ticket.ticketNumber,
        licensePlate: ticket.licensePlate,
        vehicleType: ticket.vehicleType,
        spotNumber: ticket.spotNumber,
        level: ticket.level,
        entryTime: ticket.entryTime,
        transferHistory: ticket.transferHistory
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Search active parked vehicle by license plate with live fee estimation.
 */
exports.searchActiveVehicle = async (req, res) => {
  try {
    const { plate } = req.query;

    if (!plate) {
      return res.status(400).json({ error: 'Search plate parameter is required.' });
    }

    const cleanPlate = plate.trim().toUpperCase();
    const activeTicket = await Ticket.findOne({
      licensePlate: cleanPlate,
      status: 'ACTIVE'
    }).populate('spotId');

    if (!activeTicket) {
      return res.status(404).json({ message: `No active vehicle found with license plate: ${cleanPlate}` });
    }

    const rates = await PricingConfig.getOrCreateDefault();
    const now = getNow();
    const spotType = activeTicket.spotId?.type || activeTicket.vehicleType || 'Standard';
    const currentPreviewFee = calculateFee(activeTicket.entryTime, now, rates, spotType);
    const elapsedMs = Math.max(0, now.getTime() - new Date(activeTicket.entryTime).getTime());

    res.json({
      ticket: activeTicket,
      currentEstimate: {
        actualDurationFormatted: formatDuration(elapsedMs),
        elapsedMinutes: Math.floor(elapsedMs / 60000),
        billedHours: currentPreviewFee.billedHours,
        accruedFee: currentPreviewFee.totalFee,
        feeBreakdown: currentPreviewFee,
        rates
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get parking history of completed sessions.
 */
exports.getHistory = async (req, res) => {
  try {
    const { plate, limit = 50, page = 1 } = req.query;
    const filter = { status: 'COMPLETED' };

    if (plate) {
      filter.licensePlate = { $regex: plate.trim(), $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [history, total] = await Promise.all([
      Ticket.find(filter)
        .sort({ exitTime: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Ticket.countDocuments(filter)
    ]);

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      history
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

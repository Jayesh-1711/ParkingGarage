const express = require('express');
const router = express.Router();

const garageController = require('../controllers/garageController');
const ticketController = require('../controllers/ticketController');
const configController = require('../controllers/configController');
const clockController = require('../controllers/clockController');

// Garage Overview & Layout
router.get('/garage/overview', garageController.getOverview);
router.get('/spots', garageController.getSpots);
router.post('/garage/seed', garageController.reseedGarage);

// Ticket & Vehicle Management
router.post('/tickets/check-in', ticketController.checkIn);
router.post('/tickets/check-out', ticketController.checkOut);
router.post('/tickets/transfer', ticketController.transferTicket); // Level 3: Valet Transfer
router.get('/tickets/search', ticketController.searchActiveVehicle);
router.get('/tickets/history', ticketController.getHistory);

// Pricing Configuration & Messy Importer
router.get('/config/pricing', configController.getPricing);
router.put('/config/pricing', configController.updatePricing);
router.post('/config/pricing/import-messy', configController.importMessyRates); // Level 1: Messy Rate Card Import

// Clock & Automation Endpoints
router.get('/clock', clockController.getClock);
router.post('/clock', clockController.handleClock); // Level 2: Clock & Nightly Job

module.exports = router;

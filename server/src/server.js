require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { seedGarage } = require('./services/seedService');
const ParkingSpot = require('./models/ParkingSpot');
const apiRoutes = require('./routes/api');
const clockController = require('./controllers/clockController');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Direct root /clock endpoint for automated grading (Level 2 Twist)
app.post('/clock', clockController.handleClock);
app.get('/clock', clockController.getClock);

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Connect to MongoDB and start server
connectDB().then(async () => {
  // Ensure garage is seeded with default layout if empty
  const spotCount = await ParkingSpot.countDocuments();
  if (spotCount === 0) {
    console.log('No spots found. Seeding initial garage layout...');
    await seedGarage();
  }

  app.listen(PORT, () => {
    console.log(`Parking Garage Backend running on port ${PORT}`);
  });
});

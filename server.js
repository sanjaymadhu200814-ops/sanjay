const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend web pages
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data storage (ideal for rapid prototyping and hackathons)
let bookings = [];
let currentTokenServing = 0;

// 1. Farmer Registration & Slot Booking Endpoint
app.post('/api/book-slot', (req, res) => {
  const { farmerName, phone, crop, weight, slotTime } = req.body;
  if (!farmerName || !phone || !crop) {
    return res.status(400).json({ error: 'Please provide name, phone, and crop type.' });
  }

  const tokenNumber = bookings.length + 1;
  const newBooking = {
    bookingId: `PROC-${Math.floor(1000 + Math.random() * 9000)}`,
    farmerName,
    phone,
    crop,
    weight: weight || 10,
    slotTime,
    tokenNumber,
    status: 'BOOKED', // Statuses: BOOKED -> QUEUED -> IN_INSPECTION -> COMPLETED
    paymentStatus: 'PENDING' // Statuses: PENDING -> PROCESSING -> PAID
  };

  bookings.push(newBooking);
  console.log(`[BOOKING SUCCESS] Token #${tokenNumber} assigned to ${farmerName}`);
  res.json({ success: true, booking: newBooking });
});

// 2. Real-Time Queue & Wait Time Calculation
app.get('/api/queue-status/:tokenNumber', (req, res) => {
  const token = parseInt(req.params.tokenNumber);
  const booking = bookings.find(b => b.tokenNumber === token);

  if (!booking) {
    return res.status(404).json({ error: 'Token number not found.' });
  }

  const tokensAhead = Math.max(0, token - currentTokenServing - 1);
  const estimatedWaitMins = tokensAhead * 15; // Assuming 15 minutes average processing time per farmer

  res.json({
    currentTokenServing,
    yourToken: token,
    tokensAhead,
    estimatedWaitMins,
    booking
  });
});

// 3. Procurement Operator Queue Advancement
app.post('/api/operator/next-token', (req, res) => {
  if (currentTokenServing < bookings.length) {
    currentTokenServing++;
    const activeBooking = bookings[currentTokenServing - 1];
    activeBooking.status = 'IN_INSPECTION';

    console.log(`[NOTIFICATION SENT] To ${activeBooking.phone}: Token #${activeBooking.tokenNumber} is called to Gate 1.`);
    return res.json({ success: true, currentTokenServing, activeBooking });
  }
  res.json({ success: false, message: 'All queued farmers have been processed.' });
});

// 4. Procurement & Payment Status Update
app.post('/api/operator/update-status', (req, res) => {
  const { tokenNumber, status, paymentStatus } = req.body;
  const booking = bookings.find(b => b.tokenNumber === parseInt(tokenNumber));

  if (booking) {
    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    console.log(`[STATUS UPDATED] Token #${tokenNumber} -> Status: ${booking.status}, Payment: ${booking.paymentStatus}`);
    return res.json({ success: true, booking });
  }
  res.status(404).json({ error: 'Token not found.' });
});

// Get all center records for Operator View
app.get('/api/operator/all', (req, res) => {
  res.json({ currentTokenServing, totalBookings: bookings.length, bookings });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Procurement App running at http://localhost:${PORT}`));
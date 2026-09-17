# Parking Garage Management System — Reasoning

## 1. Understanding the Problem

The main goal is to help a parking attendant manage a multi-level garage reliably.

The most important operations are:

1. Check a vehicle in.
2. Assign a suitable parking spot.
3. Check the vehicle out.
4. Calculate the correct parking fee.
5. Find a parked vehicle using its license plate.
6. Check EV spot availability.
7. Maintain parking history.

The first priority is correctness of check-in, check-out, and billing. Additional features should not complicate these core operations.

---

## 2. Technology Choice

I chose a MERN-based full-stack application:

* React + Vite for the frontend
* Node.js + Express for the backend
* MongoDB + Mongoose for persistence

This allows the project to demonstrate both application development and backend/business-logic skills.

The business logic is kept on the backend so that important operations such as fee calculation and spot allocation cannot be manipulated by the frontend.

---

## 3. Main Domain Objects

The system mainly needs three types of persistent data:

### Parking Spot

Represents a physical spot in the garage.

It stores:

* Spot number
* Level
* Spot type
* Occupancy status
* Current active ticket

### Ticket

Represents a parking session.

It stores:

* Ticket number
* License plate
* Vehicle type
* Assigned spot
* Entry time
* Exit time
* Status
* Billed hours
* Final fee

### Pricing Configuration

Stores the garage's pricing rules:

* First-hour rate
* Additional-hour rate
* Daily cap

Keeping pricing in the database makes the system reusable for different garages.

---

## 4. Parking Spot Allocation

The system supports three spot types:

* Compact
* Standard
* EV

The allocation rules are:

* Compact vehicle → Compact first, then Standard if Compact is unavailable
* Standard vehicle → Standard only
* EV vehicle → EV only

The backend chooses the spot rather than the frontend.

This prevents the client from assigning an invalid or already occupied spot.

The allocation process is deterministic so that the same garage state produces predictable results.

---

## 5. Preventing Double Parking

A major requirement is that one physical spot must never be assigned to two active vehicles.

Before assigning a spot, the backend checks that it is available.

When assigning a spot, its occupancy state is updated and associated with the active ticket.

Checkout reverses this state and makes the spot available again.

Database constraints and atomic operations should be used where necessary to reduce the possibility of race conditions during simultaneous check-ins.

---

## 6. Fee Calculation

The fee calculation follows the requirements:

* The first hour uses the first-hour rate.
* Every additional hour uses the additional-hour rate.
* Partial hours are rounded upward.
* A daily maximum cap prevents the fee from exceeding the configured limit for each billing cycle.

For example, with:

* First hour = ₹10
* Additional hour = ₹5
* Daily cap = ₹40

A stay of 2 hours and 20 minutes becomes:

```text
3 billable hours

₹10 + ₹5 + ₹5
= ₹20
```

The calculation is performed on the backend to ensure the charged amount is authoritative.

---

## 7. Handling Long Parking Sessions

The original requirement specifies a daily cap but does not define whether a "day" means a calendar day or a rolling 24-hour period.

For the MVP, the system uses a documented 24-hour billing cycle.

This avoids silently making an assumption and makes the behavior predictable for long parking sessions.

---

## 8. Vehicle Search

The attendant needs to find a vehicle quickly by license plate.

The license plate is therefore treated as an important lookup field.

The system searches active parking records by plate and returns:

* Vehicle type
* Level
* Spot
* Entry time
* Current parking status

A database index on the license plate helps keep this lookup efficient as the parking history grows.

---

## 9. EV Availability

EV vehicles must use EV spots.

Therefore, EV availability is derived from the current state of EV parking spots.

The dashboard can show:

```text
EV Spots Available: X
```

This value should come from the backend/database rather than being maintained only in frontend state.

---

## 10. Check-In Flow

The check-in process is:

```text
Vehicle arrives
      ↓
Enter license plate + vehicle type
      ↓
Check duplicate active parking
      ↓
Find compatible available spot
      ↓
Assign spot
      ↓
Create active ticket
      ↓
Vehicle is marked as parked
```

If no compatible spot is available, check-in is rejected.

---

## 11. Check-Out Flow

The checkout process is:

```text
Enter plate/ticket
      ↓
Find active parking
      ↓
Calculate parking duration
      ↓
Round partial hours upward
      ↓
Calculate fee
      ↓
Apply daily cap
      ↓
Release assigned spot
      ↓
Complete ticket
      ↓
Save parking history
```

The spot release and ticket completion must remain consistent.

---

## 12. API Design

The backend exposes focused REST APIs for the main operations:

```text
GET  /api/garage/overview
GET  /api/spots

POST /api/tickets/check-in
POST /api/tickets/check-out

GET  /api/tickets/search
GET  /api/tickets/history

GET  /api/config/pricing
PUT  /api/config/pricing
```

The API layer handles HTTP requests, while the core business logic is separated into services.

---

## 13. Frontend Structure

The frontend focuses on the attendant's workflow:

### Dashboard

Shows overall occupancy and EV availability.

### Check-In

Allows the attendant to enter a vehicle and receive an automatically assigned spot.

### Check-Out

Shows parking duration and calculated fee before completing checkout.

### Vehicle Search

Finds a currently parked vehicle by license plate.

### Parking View

Shows the current state of spots across levels.

### History / Settings

Shows completed sessions and allows pricing configuration.

---

## 14. Important Edge Cases

The system should handle:

* Vehicle already parked
* No compatible spot available
* Garage completely full
* No EV spot available
* Unknown vehicle during checkout
* Partial-hour parking
* Exactly one hour
* Parking beyond the daily cap
* Multiple-day parking
* Checkout releasing the wrong spot
* Two vehicles attempting to use the same spot
* Invalid vehicle type
* Invalid pricing configuration

These cases are important because parking and billing systems must maintain accurate state.

---

## 15. Design Principle

The main design principle is:

> Correctness first, then efficiency, then UI features.

The project intentionally avoids unnecessary functionality such as payment gateways, reservations, charging billing, lost-ticket policies, and advanced analytics because they are outside the core requirements.

This keeps the MVP small enough to understand, test, and explain while still representing a realistic parking management system.

---

## 16. Future Improvements

Possible future improvements include:

* Authentication and role-based access
* Payment integration
* QR/barcode tickets
* License plate recognition
* Real-time WebSocket updates
* Reservation support
* EV charging management
* Advanced occupancy analytics
* Multiple garage support
* Audit logs

These are intentionally outside the current MVP.


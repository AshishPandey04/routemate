# RouteMate 🚗

> Cross-city car travel, reimagined. Share the journey.

RouteMate is a full-stack carpooling platform built for inter-city travel in India. It goes beyond simple ride-sharing — riders can board a car **mid-route** from any city along the way, drivers can signal **return trips** before they happen, and multiple riders can share the same car on **different segments** of the same journey.

---

## ✨ Key Features

### For Riders
- **Search trips** across cities with date and seat filters
- **En-route boarding** — board a car passing through your city, even if it started elsewhere
- **Return trip visibility** — see cars at their destination that will return to your city
- **Real-time tracking** — live GPS map of the driver's location during the trip
- **Trip chat** — group chat with the driver and fellow riders
- **Route & return alerts** — get notified when a matching trip becomes available
- **Booking management** — cancel bookings, file disputes, rate drivers
- **Safety** — emergency contact, SOS trigger, shareable live tracking link for family

### For Drivers
- **Create multi-city trips** with intermediate stops and ETAs
- **Register vehicles** with seat count and AC details
- **Live GPS sharing** — broadcast location to all riders in real time
- **Earnings wallet** — 85% of each booking credited after trip completion
- **Payout requests** — withdraw earnings with admin approval
- **Return trip slots** — let riders at the destination know you're coming back

### For Admins
- Overview dashboard with platform stats
- Dispute resolution
- Payout approval / rejection
- Cancelled trip monitoring

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** (Turbopack) | Full-stack framework — routing, SSR, API routes, fast dev builds |
| **React 19** | UI component layer for all interactive pages |
| **Tailwind CSS v4** | Utility-first styling with custom CSS design tokens |
| **Lucide React** | Consistent SVG icon set used throughout the UI |
| **Sonner** | Toast notifications for user feedback |
| **Axios** | HTTP client with auth cookie handling and 401 redirect |
| **Socket.io-client** | Real-time GPS updates on the live tracking page |
| **@react-google-maps/api** | Google Maps with route polyline and live driver marker |
| **React Hook Form + Zod** | Form state management and schema validation |
| **Radix UI + shadcn** | Accessible headless UI primitives |

### Backend (Next.js API Routes)
| Technology | Purpose |
|---|---|
| **Prisma ORM v7** | Database schema, migrations, and type-safe queries |
| **PostgreSQL** | Primary relational database for all persistent data |
| **Jose** | JWT signing and verification via HttpOnly cookies |
| **bcryptjs** | Password hashing with constant-time comparison |
| **Razorpay** | Payment gateway — order creation, signature verification, refunds |
| **Firebase Admin (FCM)** | Push notifications to drivers on new bookings |
| **BullMQ** | Background job queue for route/return alert notifications |
| **ioredis** | Redis for seat holds, OTP storage, rate limiting, location cache |
| **@upstash/redis** | Serverless Redis client for edge-compatible contexts |

### Socket Server (Standalone Node.js)
| Technology | Purpose |
|---|---|
| **Socket.io** | WebSocket server on port 3001 for real-time GPS broadcasting |
| **Jose** | Token verification before joining a trip room |
| **pg** | Direct PostgreSQL access for trip membership validation |

### Dev & Testing
| Technology | Purpose |
|---|---|
| **Vitest** | Unit tests for booking logic and seat allocation algorithm |
| **ESLint** | Code linting with Next.js rules |

---

## 🗄 Database Models

```
User          → Riders, drivers, admins (role: RIDER / DRIVER / BOTH)
Car           → Vehicles registered by drivers
Trip          → Multi-city journey with route, pricing, status
Waypoint      → Intermediate stops with ETAs per trip
SeatSegment   → Occupied seat ranges (enables en-route boarding)
Booking       → Confirmed seat reservation
Payment       → Razorpay order + payment record per booking
GpsPing       → GPS coordinates streamed during a trip
Message       → Group chat messages per trip
RouteAlert    → Notify user when a matching trip appears
ReturnAlert   → Notify user when driver confirms return trip
Wallet        → Driver earnings balance and pending amount
Payout        → Withdrawal requests with admin approval
Rating        → Post-trip driver ratings from riders
Dispute       → Booking dispute with admin resolution
TripShareLink → Shareable live tracking link for family
SosAlert      → Emergency SOS trigger with location
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Redis instance (Upstash or local)
- Razorpay account (test mode)
- Google Maps API key
- Firebase project (for push notifications)

### 1. Clone and install

```bash
git clone https://github.com/your-username/routemate.git
cd routemate
npm install
```

### 2. Environment variables

Create a `.env.local` file in the root:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/routemate

# Auth
JWT_SECRET=your_jwt_secret_here

# Redis
UPSTASH_REDIS_REST_URL=https://your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
REDIS_URL=redis://localhost:6379

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# MSG91 (OTP)
MSG91_AUTH_KEY=your_msg91_key
MSG91_TEMPLATE_ID=your_template_id

# Admin
ADMIN_EMAILS=admin@example.com
```

### 3. Database setup

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Run the app

```bash
# Terminal 1 — Next.js app
npm run dev

# Terminal 2 — Socket server
cd socket-server
npm install
npm run dev
```

App runs at **http://localhost:3000**
Socket server runs at **http://localhost:3001**

---

## 🧪 Testing

```bash
npm run test
```

Tests cover:
- Seat availability algorithm (sweep-line peak occupancy)
- Route segment validation
- Booking conflict detection

---

## 💳 Test Payments (Razorpay Test Mode)

When the Razorpay checkout opens, use these test credentials — no real money is charged:

| Method | Details |
|---|---|
| **UPI (easiest)** | Enter `success@razorpay` as UPI ID → instant success |
| **Card** | `4111 1111 1111 1111` · Expiry: `12/28` · CVV: `123` · OTP: any 4–10 digits |

---

## 📁 Project Structure

```
routemate/
├── app/
│   ├── (auth)/          # Login, Signup pages
│   ├── (main)/          # All protected pages
│   │   ├── dashboard/
│   │   ├── search/      # Trip search with en-route results
│   │   ├── trip/[id]/   # Trip detail + booking panel
│   │   ├── my-trips/    # Driver trip management
│   │   ├── my-bookings/ # Rider booking history
│   │   ├── track/[id]/  # Live GPS tracking + chat
│   │   ├── messages/    # Trip group chat
│   │   ├── wallet/      # Driver earnings
│   │   ├── alerts/      # Route & return alerts
│   │   ├── safety/      # Emergency contact
│   │   ├── cars/        # Vehicle management
│   │   └── admin/       # Admin dashboard
│   └── api/             # All backend API routes
├── components/
│   ├── shared/          # Navbar, AuthContext, CityAutocomplete
│   ├── maps/            # TripMap component
│   └── trips/           # Trip-related components
├── lib/
│   ├── algorithms/      # Seat allocator, route matcher
│   ├── prisma.js        # Prisma client singleton
│   ├── auth.js          # JWT helpers
│   ├── razorpay.js      # Payment helpers
│   ├── socket.js        # Socket.io client
│   └── ...
├── socket-server/       # Standalone Socket.io server
├── workers/             # BullMQ background workers
│   ├── alert.worker.js  # Route & return alert notifications
│   └── refund.worker.js # Async refund processing
├── prisma/
│   └── schema.prisma    # Full database schema
└── schemas/
    └── index.js         # Zod validation schemas
```

---

## 🔐 Security

- Passwords hashed with **bcrypt** (12 rounds)
- Auth via **HttpOnly cookies** — no tokens in localStorage
- Constant-time password comparison to prevent timing attacks
- Rate limiting on login (10/min), signup (5/hr), search (100/min)
- Zod schema validation on every API request body
- Razorpay **HMAC-SHA256 signature verification** on payment confirmation
- Row-level seat locking via **Serializable transactions** to prevent double-booking

---

## 🏗 Architecture Overview

```
Browser
  │
  ├── Next.js App (port 3000)
  │     ├── React Pages (frontend)
  │     └── API Routes (backend)
  │           ├── PostgreSQL (via Prisma)
  │           ├── Redis (holds, OTP, rate limits)
  │           ├── Razorpay (payments)
  │           └── Firebase (push notifications)
  │
  └── Socket.io Server (port 3001)
        ├── Real-time GPS broadcasting
        └── Redis (location cache)
```

---

## 👥 Authors

Built as a Major Project — 8th Semester

---

## 📄 License

This project is for academic purposes.

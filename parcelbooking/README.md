# Parcel Booking System

A comprehensive Parcel Booking System built with React Native, Expo Router, Firebase, and PayGIC payment gateway.

## Features

### Customer Panel
- **OTP-based Authentication**: Firebase Phone Authentication
- **Create Bookings**: Book parcels with pickup and delivery addresses
- **Track Parcels**: Real-time tracking with status timeline
- **Booking History**: View all past bookings
- **Payment Integration**: PayGIC UPI payment gateway
- **Support**: Contact information and support channels

### Admin Panel
- **Dashboard**: View all bookings with filters
- **Update Status**: Change parcel status (Created → Picked → Shipped → Delivered)
- **Reports**: Analytics and revenue reports
- **Settings**: Manage fare rates and pricing

## Tech Stack

- **React Native** with Expo Router
- **Firebase** (Authentication, Firestore)
- **PayGIC** (UPI Payment Gateway)
- **Zustand** (State Management)
- **TypeScript**
- **Expo Vector Icons**

## Project Structure

```
parcel-booking-app/
├── app/                          # Expo Router entry point
│   ├── login/                    # Login screen
│   ├── (customer)/               # Customer routes
│   │   ├── home.tsx
│   │   ├── booking/
│   │   ├── payment/
│   │   └── support.tsx
│   └── (admin)/                  # Admin routes
│       ├── dashboard.tsx
│       ├── bookingDetails.tsx
│       ├── reports.tsx
│       └── settings.tsx
├── components/                   # Reusable UI components
├── config/                       # Configuration files
├── hooks/                        # Custom hooks
├── services/                     # Business logic
├── store/                        # Zustand stores
├── theme/                        # Theme configuration
└── utils/                        # Utility functions
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

EXPO_PUBLIC_PAYGIC_KEY=your-paygic-api-key
EXPO_PUBLIC_PAYGIC_SECRET=your-paygic-secret
```

### 3. Firebase Setup

1. Create a Firebase project
2. Enable Phone Authentication
3. Set up Firestore database
4. Add your Firebase configuration to `.env`

### 4. Admin Phone Number

Update the admin phone number in `config/index.ts`:

```typescript
adminPhone: "+911234567890",
```

### 5. Run the App

```bash
npm start
```

Then press:
- `a` for Android
- `i` for iOS
- `w` for Web

## Configuration

### Firebase Firestore Structure

#### Users Collection (`users/{uid}`)
```typescript
{
  id: string;
  phoneNumber: string;
  role: "admin" | "customer";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Bookings Collection (`bookings/{bookingId}`)
```typescript
{
  id: string;
  userId: string;
  pickup: Address;
  drop: Address;
  parcelDetails: ParcelDetails;
  status: "Created" | "Picked" | "Shipped" | "Delivered";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  fare?: number;
  trackingNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Design System

- **Primary Color**: #FF7A00 (Orange)
- **Background**: #FFFFFF (White)
- **Text**: #333333 (Dark Gray)
- **Style**: Minimalist, flat, professional

## Development Notes

- All credentials are centralized in `config/index.ts`
- Services are modular and reusable
- Real-time updates via Firestore subscriptions
- TypeScript for type safety
- Zustand for state management

## Important Notes

1. **PayGIC Integration**: The PayGIC payment service is a placeholder. Replace with actual PayGIC SDK integration.
2. **Firebase Auth**: Ensure Firebase Phone Authentication is properly configured in your Firebase console.
3. **Admin Access**: Only users with the configured admin phone number can access the admin panel.

## License

This project is private and proprietary.

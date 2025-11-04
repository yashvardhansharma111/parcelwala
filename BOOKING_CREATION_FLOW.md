# 📦 Complete Booking Creation Flow - Detailed Explanation

This document explains **exactly** what happens when a user creates a new booking in the Parcel Booking System.

---

## 🎯 Overview

When a user creates a booking, data flows through **7 layers**:
1. **Frontend UI** (React Native Form)
2. **Frontend Hook** (`useBooking`)
3. **Frontend Service** (`bookingService.ts`)
4. **API Client** (`apiClient.ts` - handles authentication)
5. **Backend Route** (`bookingRoutes.ts`)
6. **Backend Controller** (`bookingController.ts`)
7. **Backend Service** (`bookingService.ts` - saves to Firestore)

---

## 📱 STEP 1: User Interface (Frontend Form)

**File:** `parcelbooking/app/(customer)/booking/new.tsx`

### What the user sees:
- **Pickup Address Form:**
  - Name, Phone, Address, City, State, PIN Code, Landmark (optional)
  - Phone is pre-filled with logged-in user's phone number

- **Delivery Address Form:**
  - Same fields as pickup address
  - All fields must be filled except Landmark

- **Parcel Details Form:**
  - Parcel Type (required)
  - Weight in kg (required, must be > 0)
  - Description (optional)
  - Declared Value (optional)

### Code Flow:
```typescript
const handleSubmit = async () => {
  // 1. Validate pickup address
  const pickupValidation = validateAddress(pickup);
  if (!pickupValidation.isValid) {
    Alert.alert("Validation Error", pickupValidation.errors.join("\n"));
    return;
  }

  // 2. Validate drop address
  const dropValidation = validateAddress(drop);
  if (!dropValidation.isValid) {
    Alert.alert("Validation Error", dropValidation.errors.join("\n"));
    return;
  }

  // 3. Validate parcel details
  if (!parcelDetails.type || !parcelDetails.weight || parcelDetails.weight <= 0) {
    Alert.alert("Validation Error", "Please enter valid parcel details");
    return;
  }

  // 4. Call createBooking hook
  try {
    const booking = await createBooking({
      pickup,
      drop,
      parcelDetails,
    });

    // 5. Show success and navigate to payment
    Alert.alert("Success", "Booking created successfully!", [
      {
        text: "OK",
        onPress: () => router.push(`/(customer)/payment?id=${booking.id}`),
      },
    ]);
  } catch (error: any) {
    Alert.alert("Error", error.message || "Failed to create booking");
  }
};
```

---

## 🪝 STEP 2: Frontend Hook (Business Logic)

**File:** `parcelbooking/hooks/useBooking.ts`

### What happens:
1. Checks if user is authenticated
2. Prepares booking data
3. Calls the booking service
4. Updates local state (Zustand store)
5. Refreshes bookings list

### Code:
```typescript
const createBooking = async (data: {
  pickup: Address;
  drop: Address;
  parcelDetails: ParcelDetails;
}) => {
  try {
    // 1. Check authentication
    if (!user) throw new Error("User not authenticated");

    setError(null);
    setLoading(true);

    // 2. Prepare booking data (exclude fields that backend will set)
    const bookingData: Omit<Booking, "id" | "userId" | "createdAt" | "updatedAt" | "trackingNumber" | "status" | "paymentStatus"> = {
      pickup: data.pickup,
      drop: data.drop,
      parcelDetails: data.parcelDetails,
    };

    // 3. Call service to send HTTP request
    const booking = await bookingService.createBooking(bookingData);
    
    // 4. Add to local store
    addBooking(booking);
    
    // 5. Refresh bookings list
    await fetchBookings();
    
    // 6. Return created booking
    return booking;
  } catch (error: any) {
    setError(error.message || "Failed to create booking");
    throw error;
  } finally {
    setLoading(false);
  }
};
```

---

## 🌐 STEP 3: Frontend Service (API Call)

**File:** `parcelbooking/services/bookingService.ts`

### What happens:
1. Calls `apiRequest` with booking data
2. Sends POST request to `/bookings` endpoint
3. Returns the booking object from response

### Code:
```typescript
export const createBooking = async (
  bookingData: Omit<Booking, "id" | "userId" | "createdAt" | "updatedAt" | "trackingNumber" | "status" | "paymentStatus">
): Promise<Booking> => {
  try {
    // Make POST request to backend
    const response = await apiRequest<{ booking: Booking }>("/bookings", {
      method: "POST",
      body: JSON.stringify({
        pickup: bookingData.pickup,
        drop: bookingData.drop,
        parcelDetails: bookingData.parcelDetails,
        fare: bookingData.fare, // Optional - may be undefined
      }),
    });

    return response.booking;
  } catch (error: any) {
    throw new Error(error.message || "Failed to create booking");
  }
};
```

---

## 🔐 STEP 4: API Client (Authentication & HTTP)

**File:** `parcelbooking/services/apiClient.ts`

### What happens:
1. Gets access token from AsyncStorage
2. Adds `Authorization: Bearer <token>` header
3. Makes HTTP request to backend
4. Handles token refresh if 401 (expired)
5. Handles errors with helpful messages

### Code Flow:
```typescript
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${apiConfig.baseUrl}${endpoint}`; // e.g., https://xyz.ngrok-free.app/bookings
  const accessToken = await getAccessToken(); // From AsyncStorage

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // Add ngrok header if using ngrok
  if (apiConfig.baseUrl.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  // Add authorization header
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Make request
  const response = await fetch(url, {
    ...options,
    headers,
    mode: "cors",
    cache: "no-cache",
  });

  // Handle 401 (expired token) - try refresh
  if (response.status === 401 && accessToken) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      // Retry request with new token
      // ... (retry logic)
    }
  }

  // Parse and return response
  const data: ApiResponse<T> = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || "Request failed");
  }
  return data.data as T;
};
```

### Request Example:
```http
POST https://8fc747829809.ngrok-free.app/bookings
Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ngrok-skip-browser-warning: true

Body:
{
  "pickup": {
    "name": "John Doe",
    "phone": "+911234567890",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "landmark": "Near Park"
  },
  "drop": {
    "name": "Jane Smith",
    "phone": "+919876543210",
    "address": "456 Oak Ave",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "landmark": ""
  },
  "parcelDetails": {
    "type": "Document",
    "weight": 0.5,
    "description": "Important papers",
    "value": 1000
  },
  "fare": undefined  // Optional - will be excluded if undefined
}
```

---

## 🛣️ STEP 5: Backend Route (Routing)

**File:** `backend/src/routes/bookingRoutes.ts`

### What happens:
1. Route receives request at `POST /bookings`
2. Middleware `authenticate` runs first (validates JWT token)
3. If authenticated, calls `bookingController.createBooking`

### Code:
```typescript
const router = Router();

// All booking routes require authentication
router.use(authenticate);

// Create booking endpoint
router.post("/", bookingController.createBooking);
```

### Middleware Flow:
1. `authenticate` middleware:
   - Extracts token from `Authorization: Bearer <token>` header
   - Verifies JWT token signature
   - Decodes token to get `{ uid, phoneNumber, role }`
   - Attaches `req.user = { uid, phoneNumber, role }`
   - If invalid/expired, returns 401

---

## 🎮 STEP 6: Backend Controller (Request Handler)

**File:** `backend/src/controllers/bookingController.ts`

### What happens:
1. Extracts `userId` from `req.user.uid` (set by auth middleware)
2. Extracts booking data from request body
3. Validates all required fields
4. Calls booking service to save to database
5. Returns created booking

### Code:
```typescript
export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Get user ID from authenticated token
    const userId = req.user!.uid; // Set by authenticate middleware
    
    // 2. Extract request body
    const { pickup, drop, parcelDetails, fare } = req.body;

    // 3. Validate pickup address
    if (!pickup || !drop || !parcelDetails) {
      throw createError("Pickup, drop, and parcel details are required", 400);
    }

    if (!pickup.name || !pickup.phone || !pickup.address || !pickup.city || !pickup.state || !pickup.pincode) {
      throw createError("Complete pickup address is required", 400);
    }

    // 4. Validate drop address
    if (!drop.name || !drop.phone || !drop.address || !drop.city || !drop.state || !drop.pincode) {
      throw createError("Complete drop address is required", 400);
    }

    // 5. Validate parcel details
    if (!parcelDetails.type || !parcelDetails.weight) {
      throw createError("Parcel type and weight are required", 400);
    }

    // 6. Call service to save to Firestore
    const booking = await bookingService.createBooking(userId, {
      pickup,
      drop,
      parcelDetails,
      fare, // Optional - may be undefined
    });

    // 7. Return success response
    res.status(201).json({
      success: true,
      data: { booking },
    });
  } catch (error: any) {
    next(error); // Pass to error handler
  }
};
```

### Response Example:
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "abc123xyz",
      "userId": "user_uid_from_token",
      "pickup": { ... },
      "drop": { ... },
      "parcelDetails": { ... },
      "status": "Created",
      "paymentStatus": "pending",
      "fare": null,
      "trackingNumber": "PB-1734567890-ABC123",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

## 💾 STEP 7: Backend Service (Database Operations)

**File:** `backend/src/services/bookingService.ts`

### What happens:
1. Generates unique tracking number
2. Creates booking document structure
3. **Filters out undefined values** (Firestore doesn't accept undefined)
4. Saves to Firestore `bookings` collection
5. Returns booking with all fields

### Code:
```typescript
export const createBooking = async (
  userId: string,
  bookingData: {
    pickup: Address;
    drop: Address;
    parcelDetails: ParcelDetails;
    fare?: number;
  }
): Promise<Booking> => {
  try {
    // 1. Generate unique tracking number
    const trackingNumber = generateTrackingNumber(); // e.g., "PB-1734567890-ABC123"
    const now = new Date();

    // 2. Build booking data (exclude undefined values)
    const bookingData_1: any = {
      userId,
      pickup: bookingData.pickup,
      drop: bookingData.drop,
      parcelDetails: bookingData.parcelDetails,
      status: "Created" as BookingStatus,
      paymentStatus: "pending" as PaymentStatus,
      trackingNumber,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 3. Only add fare if it's defined (Firestore rejects undefined)
    if (bookingData.fare !== undefined) {
      bookingData_1.fare = bookingData.fare;
    }

    // 4. Save to Firestore
    const bookingRef = db.collection("bookings").doc();
    await bookingRef.set(bookingData_1);

    // 5. Fetch the created document
    const bookingDoc = await bookingRef.get();
    const data = bookingDoc.data()!;

    // 6. Return formatted booking
    return {
      id: bookingDoc.id,
      userId: data.userId,
      pickup: data.pickup,
      drop: data.drop,
      parcelDetails: data.parcelDetails,
      status: data.status,
      paymentStatus: data.paymentStatus,
      fare: data.fare,
      trackingNumber: data.trackingNumber,
      createdAt: data.createdAt?.toDate() || now,
      updatedAt: data.updatedAt?.toDate() || now,
    };
  } catch (error: any) {
    console.error("Error creating booking:", error);
    throw createError("Failed to create booking", 500);
  }
};
```

### Firestore Document Structure:
```javascript
// Collection: bookings
// Document ID: auto-generated (e.g., "abc123xyz")
{
  "userId": "user_uid_from_token",
  "pickup": {
    "name": "John Doe",
    "phone": "+911234567890",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "landmark": "Near Park"
  },
  "drop": {
    "name": "Jane Smith",
    "phone": "+919876543210",
    "address": "456 Oak Ave",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "landmark": ""
  },
  "parcelDetails": {
    "type": "Document",
    "weight": 0.5,
    "description": "Important papers",
    "value": 1000
  },
  "status": "Created",
  "paymentStatus": "pending",
  "trackingNumber": "PB-1734567890-ABC123",
  "createdAt": Timestamp, // Firestore server timestamp
  "updatedAt": Timestamp  // Firestore server timestamp
  // Note: "fare" is NOT included if undefined
}
```

---

## 🔄 Complete Flow Diagram

```
User fills form
    ↓
handleSubmit() validates
    ↓
useBooking.createBooking() checks auth
    ↓
bookingService.createBooking() prepares data
    ↓
apiClient.apiRequest() adds JWT token header
    ↓
HTTP POST to backend
    ↓
bookingRoutes.ts → authenticate middleware (verifies JWT)
    ↓
bookingController.createBooking() validates data
    ↓
bookingService.createBooking() generates tracking number
    ↓
Firestore: db.collection("bookings").doc().set()
    ↓
Booking saved! Returns booking object
    ↓
Response flows back through all layers
    ↓
Frontend shows success alert
    ↓
User navigates to payment screen
```

---

## 🔑 Key Features

### ✅ Authentication
- User must be logged in (JWT token required)
- Token automatically refreshed if expired
- User ID extracted from token (no need to send separately)

### ✅ Validation
- **Frontend**: Validates addresses and parcel details
- **Backend**: Double-checks all required fields
- Prevents invalid data from reaching database

### ✅ Auto-Generated Fields
- **Tracking Number**: Format `PB-{timestamp}-{random}` (e.g., `PB-1734567890-ABC123`)
- **Status**: Automatically set to `"Created"`
- **Payment Status**: Automatically set to `"pending"`
- **Created/Updated Timestamps**: Firestore server timestamps
- **Document ID**: Auto-generated by Firestore

### ✅ Undefined Handling
- Frontend may send `fare: undefined`
- Backend filters out undefined values before saving to Firestore
- Prevents Firestore errors: "Cannot use undefined as a Firestore value"

### ✅ Error Handling
- Network errors: User-friendly messages
- Validation errors: Field-specific messages
- Auth errors: Automatic token refresh or logout
- Database errors: Logged on backend, generic message to user

### ✅ State Management
- Booking added to Zustand store immediately
- Bookings list refreshed after creation
- Loading states managed automatically
- Error states tracked for UI feedback

---

## 📝 Example: Complete Request/Response

### Request (from frontend):
```http
POST https://8fc747829809.ngrok-free.app/bookings
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJ1c2VyXzEyMyIsInBob25lTnVtYmVyIjoiKzkxMTIzNDU2Nzg5MCIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTczNDU2Nzg5MCwiZXhwIjoxNzM0NTc4NjkwfQ.xyz123
Content-Type: application/json

{
  "pickup": {
    "name": "John Doe",
    "phone": "+911234567890",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "landmark": "Near Park"
  },
  "drop": {
    "name": "Jane Smith",
    "phone": "+919876543210",
    "address": "456 Oak Avenue",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "landmark": ""
  },
  "parcelDetails": {
    "type": "Document",
    "weight": 0.5,
    "description": "Important contract papers",
    "value": 5000
  }
}
```

### Response (from backend):
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "abc123def456",
      "userId": "user_123",
      "pickup": {
        "name": "John Doe",
        "phone": "+911234567890",
        "address": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "landmark": "Near Park"
      },
      "drop": {
        "name": "Jane Smith",
        "phone": "+919876543210",
        "address": "456 Oak Avenue",
        "city": "Delhi",
        "state": "Delhi",
        "pincode": "110001",
        "landmark": ""
      },
      "parcelDetails": {
        "type": "Document",
        "weight": 0.5,
        "description": "Important contract papers",
        "value": 5000
      },
      "status": "Created",
      "paymentStatus": "pending",
      "fare": null,
      "trackingNumber": "PB-1734567890-XYZ789",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## 🎯 Summary

**For the user:**
1. Fill out booking form (pickup, delivery, parcel details)
2. Click "Create Booking"
3. See success message
4. Redirected to payment screen

**Behind the scenes:**
1. Form validation
2. JWT token authentication
3. HTTP request to backend
4. Backend validation
5. Generate tracking number
6. Save to Firestore database
7. Return booking with all details
8. Update UI with new booking

**Result:**
- Booking created successfully
- Unique tracking number assigned
- Booking visible in user's booking history
- Ready for payment processing


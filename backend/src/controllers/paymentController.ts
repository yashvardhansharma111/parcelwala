/**
 * Payment Controller
 * Handles payment-related HTTP requests
 */

import { Request, Response, NextFunction } from "express";
import * as paygicService from "../services/paygicService";
import * as bookingService from "../services/bookingService";
import { createError } from "../utils/errorHandler";
import { ENV } from "../config/env";

/**
 * Create payment page for a booking
 * POST /payments/create
 * For online payments, this now accepts booking data and creates booking only after payment success
 */
export const createPaymentPage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { 
      bookingId, // Optional - if booking already exists (COD flow)
      bookingData, // For online payments - booking data to create after payment
      customerName, 
      customerEmail, 
      customerMobile 
    } = req.body;

    // Validation
    if (!customerName || !customerEmail || !customerMobile) {
      throw createError(
        "Customer name, email, and mobile are required",
        400
      );
    }

    let booking;
    let fare: number;
    let merchantReferenceId: string;

    if (bookingId) {
      // Existing booking (COD or retry payment)
      booking = await bookingService.getBookingById(bookingId);

      if (!booking) {
        throw createError("Booking not found", 404);
      }

      // Verify booking belongs to the user
      if (booking.userId !== userId) {
        throw createError("Unauthorized: Booking does not belong to user", 403);
      }

      if (booking.paymentStatus === "paid") {
        throw createError("Booking is already paid", 400);
      }

      if (!booking.fare) {
        throw createError("Booking fare not found", 400);
      }

      fare = booking.fare;
      merchantReferenceId = `${bookingId}-${Date.now()}`;
    } else if (bookingData) {
      // New online payment - booking will be created after payment success
      // Validate booking data
      if (!bookingData.pickup || !bookingData.drop || !bookingData.parcelDetails) {
        throw createError("Complete booking data is required", 400);
      }

      if (!bookingData.fare || bookingData.fare <= 0) {
        throw createError("Valid fare is required", 400);
      }

      fare = bookingData.fare;
      // Use a temporary ID that will be replaced with actual booking ID after payment
      const tempId = `temp-${userId}-${Date.now()}`;
      merchantReferenceId = `${tempId}-${Date.now()}`;
    } else {
      throw createError("Either bookingId or bookingData is required", 400);
    }

    // Construct redirect URLs - MUST be absolute URLs (full URL with protocol and domain)
    // Paygic will redirect to these URLs, which should then redirect to app
    // Use environment variable if set, otherwise construct from request
    let baseUrl = ENV.PAYGIC_SUCCESS_URL;
    
    // If PAYGIC_SUCCESS_URL already includes the path, use it as-is
    // Otherwise, construct from request
    if (!baseUrl || baseUrl.trim() === "") {
      // Construct absolute URL from request
      const protocol = req.protocol || "http";
      const host = req.get("host") || "localhost:8000";
      baseUrl = `${protocol}://${host}`;
    }
    
    // Clean up baseUrl - remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, "");
    
    // Check if baseUrl already contains /api/payments/success
    let successUrl: string;
    if (baseUrl.includes("/api/payments/success")) {
      // Already has the path, just append query params
      const separator = baseUrl.includes("?") ? "&" : "?";
      successUrl = `${baseUrl}${separator}merchantRefId=${encodeURIComponent(merchantReferenceId)}`;
    } else {
      // Need to add the path
      successUrl = `${baseUrl}/api/payments/success?merchantRefId=${encodeURIComponent(merchantReferenceId)}`;
    }
    
    // Same for failed URL
    let failedBaseUrl = ENV.PAYGIC_FAILED_URL || baseUrl.replace(/\/api\/payments\/success.*$/, "");
    failedBaseUrl = failedBaseUrl.replace(/\/$/, "");
    
    let failedUrl: string;
    if (failedBaseUrl.includes("/api/payments/failed")) {
      const separator = failedBaseUrl.includes("?") ? "&" : "?";
      failedUrl = `${failedBaseUrl}${separator}merchantRefId=${encodeURIComponent(merchantReferenceId)}`;
    } else {
      failedUrl = `${failedBaseUrl}/api/payments/failed?merchantRefId=${encodeURIComponent(merchantReferenceId)}`;
    }
    
    console.log(`[PaymentController] Redirect URLs:`, {
      successUrl,
      failedUrl,
      baseUrl,
      host: req.get("host"),
      protocol: req.protocol,
      envSuccessUrl: ENV.PAYGIC_SUCCESS_URL,
    });

    // Create payment page via Paygic
    const paymentPage = await paygicService.createPaymentPage(
      merchantReferenceId,
      fare,
      customerMobile,
      customerName,
      customerEmail,
      successUrl,
      failedUrl
    );

    // Store booking data temporarily if this is a new booking (for webhook to create it)
    if (bookingData && !bookingId) {
      // Store in a temporary collection or pass via merchantReferenceId
      // For now, we'll encode it in the merchantReferenceId and extract it in webhook
      // Better approach: Store in a temporary Firestore collection with TTL
      const tempBookingRef = await bookingService.storeTempBookingData(userId, bookingData, merchantReferenceId);
      console.log(`[PaymentController] Stored temp booking data with ref: ${tempBookingRef}`);
    }

    res.json({
      success: true,
      data: {
        paymentUrl: paymentPage.data.payPageUrl,
        merchantReferenceId: paymentPage.data.merchantReferenceId,
        paygicReferenceId: paymentPage.data.paygicReferenceId,
        expiry: paymentPage.data.expiry,
        amount: paymentPage.data.amount,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Check payment status
 * POST /payments/status
 */
export const checkPaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { merchantReferenceId } = req.body;

    if (!merchantReferenceId) {
      throw createError("Merchant reference ID is required", 400);
    }

    const status = await paygicService.checkPaymentStatus(merchantReferenceId);

    // If status is PENDING, return it gracefully instead of throwing error
    if (status.txnStatus === "PENDING") {
      res.json({
        success: true,
        status: "PENDING",
        message: "Transaction is not successful",
      });
      return;
    }

    res.json({
      success: true,
      status: status.txnStatus,
      data: status,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Payment webhook/callback handler
 * POST /payments/webhook
 */
export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log(`[Webhook] Received webhook request:`, {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url,
    });

    // Validate webhook payload
    const webhookData = paygicService.validateWebhookPayload(req.body);

    const { txnStatus, data } = webhookData;
    const merchantReferenceId = data.merchantReferenceId;

    console.log(`[Webhook] Processing webhook:`, {
      txnStatus,
      merchantReferenceId,
      amount: data.amount,
      paygicReferenceId: data.paygicReferenceId,
    });

    // IMPORTANT: Verify payment status by calling Paygic API
    // This ensures we only create bookings for confirmed successful payments
    console.log(`[Webhook] 🔍 Verifying payment status with Paygic API...`);
    let verifiedStatus: string;
    try {
      const statusResponse = await paygicService.checkPaymentStatus(merchantReferenceId);
      verifiedStatus = statusResponse.txnStatus;
      console.log(`[Webhook] ✅ Payment status verified: ${verifiedStatus}`, {
        status: statusResponse.status,
        statusCode: statusResponse.statusCode,
        msg: statusResponse.msg,
        amount: statusResponse.data?.amount,
        paygicReferenceId: statusResponse.data?.paygicReferenceId,
        successDate: statusResponse.data?.successDate,
      });
      
      // Only proceed if verified status is SUCCESS
      if (verifiedStatus !== "SUCCESS") {
        console.log(`[Webhook] ⚠️  Payment status is not SUCCESS (${verifiedStatus}), skipping booking creation`);
      }
    } catch (statusError: any) {
      console.error(`[Webhook] ❌ Error verifying payment status:`, statusError.message);
      // If verification fails, we can't trust the webhook - log but don't create booking
      throw createError(`Failed to verify payment status: ${statusError.message}`, 500);
    }

    // Check if this is a temp booking (starts with "temp-")
    const isTempBooking = merchantReferenceId.startsWith("temp-");
    
    let bookingId: string | null = null;

    if (isTempBooking) {
      console.log(`[Webhook] This is a temp booking, fetching temp booking data...`);
      
      // This is a new booking - need to create it
      // Get temp booking data using merchantReferenceId directly
      const tempBookingData = await bookingService.getTempBookingData(merchantReferenceId);
      
      if (!tempBookingData) {
        console.error(`[Webhook] ❌ Temp booking data not found for merchantReferenceId: ${merchantReferenceId}`);
        throw createError("Temporary booking data not found", 404);
      }

      console.log(`[Webhook] ✅ Temp booking data found:`, {
        userId: tempBookingData.userId,
        fare: tempBookingData.fare,
        hasPickup: !!tempBookingData.pickup,
        hasDrop: !!tempBookingData.drop,
        hasParcelDetails: !!tempBookingData.parcelDetails,
      });

      // Only create booking if payment is verified as SUCCESS
      if (verifiedStatus === "SUCCESS") {
        console.log(`[Webhook] ✅ Payment verified as SUCCESS - Creating booking...`);
        
        // Create the actual booking
        const booking = await bookingService.createBooking(tempBookingData.userId, {
          pickup: tempBookingData.pickup,
          drop: tempBookingData.drop,
          parcelDetails: tempBookingData.parcelDetails,
          fare: tempBookingData.fare,
          paymentMethod: "online",
          couponCode: tempBookingData.couponCode,
        });

        console.log(`[Webhook] ✅ Booking created: ${booking.id}`);

        // Update payment status to paid (this will also set status from PendingPayment to Created)
        await bookingService.updatePaymentStatus(booking.id, "paid");
        
        bookingId = booking.id;
        
        // Update temp booking data with actual booking ID (for success handler)
        // Use sanitized merchantReferenceId as tempId
        const tempId = merchantReferenceId.replace(/[^a-zA-Z0-9_-]/g, "_");
        await bookingService.updateTempBookingData(tempId, booking.id);
        
        console.log(`[Webhook] ✅ Updated temp booking data with booking ID: ${booking.id}`);
        
        // Delete temp booking data after a delay (to allow success handler to read it)
        setTimeout(() => {
          bookingService.deleteTempBookingData(tempId).catch(console.error);
        }, 60000); // Delete after 1 minute
        
        console.log(`[Webhook] ✅ Successfully processed: Created booking ${bookingId} after verified successful payment`);
      } else if (verifiedStatus === "FAILED" || txnStatus === "FAILED") {
        console.log(`[Webhook] Payment FAILED - Deleting temp booking data...`);
        // Delete temp booking data - booking was never created
        const tempId = merchantReferenceId.replace(/[^a-zA-Z0-9_-]/g, "_");
        await bookingService.deleteTempBookingData(tempId);
        console.log(`[Webhook] ✅ Temp booking data deleted for: ${tempId}`);
      } else {
        console.log(`[Webhook] ⚠️  Payment status is PENDING or unknown (${verifiedStatus}), not creating booking yet`);
      }
    } else {
      console.log(`[Webhook] This is an existing booking...`);
      // Existing booking - extract booking ID from merchantReferenceId (format: bookingId-timestamp)
      const parts = merchantReferenceId.split("-");
      bookingId = parts[0];

      // Only update payment status if verified as SUCCESS
      if (verifiedStatus === "SUCCESS" && bookingId) {
        console.log(`[Webhook] ✅ Payment verified as SUCCESS - Updating existing booking ${bookingId} payment status to paid...`);
        // This will also confirm the booking (set status from PendingPayment to Created)
        await bookingService.updatePaymentStatus(bookingId, "paid");
        console.log(`[Webhook] ✅ Updated booking ${bookingId} payment status to paid`);
      } else if (verifiedStatus === "FAILED" && bookingId) {
        console.log(`[Webhook] Payment verified as FAILED - Updating existing booking ${bookingId} payment status to failed...`);
        await bookingService.updatePaymentStatus(bookingId, "failed");
        console.log(`[Webhook] ✅ Updated booking ${bookingId} payment status to failed`);
      } else {
        console.log(`[Webhook] ⚠️  Payment status is PENDING or unknown (${verifiedStatus}), not updating booking status`);
      }
    }

    // Log webhook for debugging
    console.log(`[Webhook] 📊 Final webhook summary:`, {
      bookingId,
      merchantReferenceId,
      txnStatus,
      isTempBooking,
      amount: data.amount,
      paygicReferenceId: data.paygicReferenceId,
    });

    // Return success response to Paygic
    res.status(200).json({
      success: true,
      message: "Webhook received",
      bookingId: bookingId || undefined,
    });
  } catch (error: any) {
    console.error(`[Webhook] ❌ ERROR processing webhook:`, {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    // Still return 200 to prevent Paygic from retrying
    res.status(200).json({
      success: false,
      message: error.message || "Webhook processing failed",
    });
  }
};

/**
 * Payment success redirect handler
 * GET /payments/success
 */
export const paymentSuccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { merchantRefId } = req.query;

    console.log(`[PaymentSuccess] 🔵 ========== PAYMENT SUCCESS REQUEST ==========`);
    console.log(`[PaymentSuccess] 📥 Request received:`, {
      method: req.method,
      url: req.url,
      merchantRefId: merchantRefId,
      query: req.query,
      headers: {
        "user-agent": req.headers["user-agent"],
        "accept": req.headers["accept"],
        "x-requested-with": req.headers["x-requested-with"],
        "referer": req.headers["referer"],
      },
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString(),
    });

    if (!merchantRefId) {
      console.error(`[PaymentSuccess] ❌ Missing merchantRefId in request`);
      throw createError("Missing required parameters", 400);
    }

    // Check if this is an API request (from app) or browser request
    const isApiRequest = req.headers["accept"]?.includes("application/json") || 
                         req.headers["user-agent"]?.includes("okhttp") ||
                         req.headers["user-agent"]?.includes("ReactNative") ||
                         req.headers["x-requested-with"] === "XMLHttpRequest";
    
    console.log(`[PaymentSuccess] 📱 Request type detection:`, {
      isApiRequest: isApiRequest,
      userAgent: req.headers["user-agent"],
      acceptHeader: req.headers["accept"],
      xRequestedWith: req.headers["x-requested-with"],
    });

    // Verify payment status
    console.log(`[PaymentSuccess] 🔍 Verifying payment status with Paygic for merchantRefId: ${merchantRefId}`);
    const statusResponse = await paygicService.checkPaymentStatus(
      merchantRefId as string
    );
    
    console.log(`[PaymentSuccess] ✅ Payment status verification result:`, {
      txnStatus: statusResponse.txnStatus,
      status: statusResponse.status,
      msg: statusResponse.msg,
      amount: statusResponse.data?.amount,
      paygicReferenceId: statusResponse.data?.paygicReferenceId,
    });

    if (statusResponse.txnStatus === "SUCCESS") {
      // Extract booking ID from merchant reference
      const merchantRefIdStr = merchantRefId as string;
      const isTempBooking = merchantRefIdStr.startsWith("temp-");
      
      let bookingId: string | null = null;
      
      if (isTempBooking) {
        console.log(`[PaymentSuccess] Temp booking detected, checking if webhook created booking...`);
        
        // Find the booking that was created by webhook
        // Get temp booking data using merchantReferenceId directly
        let tempBookingData = await bookingService.getTempBookingData(merchantRefIdStr);
        
        // Wait a bit for webhook to complete (webhook might be processing)
        // Check up to 3 times with delays
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 500; // 500ms
        
        while (retryCount < maxRetries && (!tempBookingData || !tempBookingData.bookingId)) {
          if (retryCount > 0) {
            console.log(`[PaymentSuccess] ⏳ Waiting for webhook to complete (attempt ${retryCount + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            tempBookingData = await bookingService.getTempBookingData(merchantRefIdStr);
          }
          retryCount++;
        }
        
        if (tempBookingData && tempBookingData.bookingId) {
          // Webhook already created the booking
          bookingId = tempBookingData.bookingId;
          console.log(`[PaymentSuccess] ✅ Booking already created by webhook: ${bookingId}`);
          
          // Verify the booking actually exists in the database
          const existingBooking = await bookingService.getBookingById(bookingId);
          if (!existingBooking) {
            console.warn(`[PaymentSuccess] ⚠️  Booking ID ${bookingId} from temp data doesn't exist in database, will create new booking`);
            tempBookingData.bookingId = undefined; // Force creation
          } else {
            console.log(`[PaymentSuccess] ✅ Verified booking exists in database: ${bookingId}`);
            console.log(`[PaymentSuccess] 📋 Current booking status:`, {
              bookingId: bookingId,
              status: existingBooking.status,
              paymentStatus: existingBooking.paymentStatus,
            });
            
            // Ensure payment status is updated to "paid" and status is "Created"
            // This handles cases where webhook might not have completed the update
            if (existingBooking.paymentStatus !== "paid" || existingBooking.status === "PendingPayment") {
              console.log(`[PaymentSuccess] 🔄 Payment status not yet updated, updating now...`);
              await bookingService.updatePaymentStatus(bookingId, "paid");
              
              // Verify the update
              const updatedBooking = await bookingService.getBookingById(bookingId);
              if (updatedBooking) {
                console.log(`[PaymentSuccess] ✅ Verified booking status after payment update:`, {
                  bookingId: bookingId,
                  status: updatedBooking.status,
                  paymentStatus: updatedBooking.paymentStatus,
                });
              }
            } else {
              console.log(`[PaymentSuccess] ✅ Booking already has correct status (Created, paid)`);
            }
          }
        }
        
        // Only create booking if webhook hasn't created it yet
        if (!bookingId && tempBookingData) {
          // Webhook hasn't created booking yet - create it now as fallback
          console.log(`[PaymentSuccess] ⚠️  Webhook hasn't created booking yet (checked ${retryCount} times), creating now as fallback...`);
          
          try {
            // Double-check: Search for any existing booking with this merchantRefId
            // This prevents duplicates if webhook created it but temp data wasn't updated
            const allUserBookings = await bookingService.getUserBookings(tempBookingData.userId, { limit: 100 });
            const existingBookingForRef = allUserBookings.bookings.find(
              (b: any) => b.merchantReferenceId === merchantRefIdStr || 
                         (b.paymentMethod === "online" && 
                          Math.abs((b.fare || 0) - tempBookingData.fare) < 0.01 &&
                          b.status === "Created")
            );
            
            if (existingBookingForRef) {
              console.log(`[PaymentSuccess] ✅ Found existing booking for this payment: ${existingBookingForRef.id}`);
              bookingId = existingBookingForRef.id;
              
              // Update temp booking data with the found booking ID
              const tempId = merchantRefIdStr.replace(/[^a-zA-Z0-9_-]/g, "_");
              await bookingService.updateTempBookingData(tempId, bookingId);
            } else {
              // No existing booking found, create new one
              const booking = await bookingService.createBooking(tempBookingData.userId, {
                pickup: tempBookingData.pickup,
                drop: tempBookingData.drop,
                parcelDetails: tempBookingData.parcelDetails,
                fare: tempBookingData.fare,
                paymentMethod: "online",
                couponCode: tempBookingData.couponCode,
              });

              console.log(`[PaymentSuccess] ✅ Booking created: ${booking.id}`);
              console.log(`[PaymentSuccess] 📋 Booking initial status: ${booking.status}, paymentStatus: ${booking.paymentStatus}`);

              // Update payment status to paid (this will also set status from PendingPayment to Created)
              console.log(`[PaymentSuccess] 🔄 Updating payment status to paid...`);
              await bookingService.updatePaymentStatus(booking.id, "paid");
              
              // Verify the status was updated
              const updatedBooking = await bookingService.getBookingById(booking.id);
              if (updatedBooking) {
                console.log(`[PaymentSuccess] ✅ Verified booking status after payment update:`, {
                  bookingId: booking.id,
                  status: updatedBooking.status,
                  paymentStatus: updatedBooking.paymentStatus,
                });
              }
              
              bookingId = booking.id;
              
              // Update temp booking data with actual booking ID
              const tempId = merchantRefIdStr.replace(/[^a-zA-Z0-9_-]/g, "_");
              await bookingService.updateTempBookingData(tempId, booking.id);
              
              console.log(`[PaymentSuccess] ✅ Updated temp booking data with booking ID: ${booking.id}`);
            }
          } catch (bookingError: any) {
            console.error(`[PaymentSuccess] ❌ Error creating booking:`, bookingError.message);
            throw createError("Failed to create booking. Please contact support.", 500);
          }
        } else if (!tempBookingData) {
          // Temp booking data not found
          console.error(`[PaymentSuccess] ❌ Temp booking data not found for: ${merchantRefIdStr}`);
          throw createError("Booking not found. Please check your bookings.", 404);
        }
      } else {
        // Extract booking ID from merchantRefId (format: bookingId-timestamp)
        const parts = merchantRefIdStr.split("-");
        bookingId = parts[0];
        console.log(`[PaymentSuccess] Existing booking detected: ${bookingId}`);
        // Update booking payment status (this will also confirm booking from PendingPayment to Created)
        await bookingService.updatePaymentStatus(bookingId, "paid");
        console.log(`[PaymentSuccess] ✅ Updated booking ${bookingId} payment status to paid`);
      }

      // If this is an API request from the app, return JSON instead of redirect
      if (isApiRequest) {
        console.log(`[PaymentSuccess] API request detected, returning JSON response`);
        res.json({
          success: true,
          bookingId: bookingId || null,
          message: "Payment successful",
          merchantRefId: merchantRefId as string,
        });
        return;
      }

      // For browser requests, return HTML page with JavaScript redirect
      // This is more reliable than HTTP 302 for custom schemes on mobile browsers
      const queryParams = `merchantRefId=${encodeURIComponent(merchantRefId as string)}${bookingId ? `&bookingId=${bookingId}` : ""}`;
      const deepLinkUrl = `parcelbooking://payment/success?${queryParams}`;
      
      // Detect if this is Android or iOS
      // Note: Some proxies/emulators may change user agent, so we also check for mobile-specific headers
      const userAgent = req.headers["user-agent"] || "";
      const isAndroid = userAgent.includes("Android") || 
                        userAgent.toLowerCase().includes("android") ||
                        req.headers["x-android"] === "true" ||
                        req.headers["sec-ch-ua-platform"]?.includes("Android");
      const isIOS = userAgent.includes("iPhone") || 
                    userAgent.includes("iPad") || 
                    userAgent.includes("iPod") ||
                    userAgent.includes("iOS") ||
                    req.headers["x-ios"] === "true" ||
                    req.headers["sec-ch-ua-platform"]?.includes("iOS");
      
      // Log detection for debugging
      console.log(`[PaymentSuccess] 📱 Device detection:`, {
        userAgent: userAgent,
        isAndroid: isAndroid,
        isIOS: isIOS,
        secChUaPlatform: req.headers["sec-ch-ua-platform"],
        xAndroid: req.headers["x-android"],
        xIos: req.headers["x-ios"],
      });
      
      // Use Android Intent URL for Android, direct deep link for iOS
      const androidIntentUrl = `intent://payment/success?${queryParams}#Intent;scheme=parcelbooking;package=com.ratlam.parcelbooking;end`;
      const redirectUrl = isAndroid ? androidIntentUrl : deepLinkUrl;
      
      console.log(`[PaymentSuccess] 🔗 Deep link generation:`, {
        userAgent: userAgent,
        isAndroid: isAndroid,
        isIOS: isIOS,
        deepLinkUrl: deepLinkUrl,
        androidIntentUrl: androidIntentUrl,
        selectedRedirectUrl: redirectUrl,
        queryParams: queryParams,
        bookingId: bookingId,
      });
      
      console.log(`[PaymentSuccess] 📄 Returning HTML redirect page with deep link: ${redirectUrl}`);
      
      // Return HTML page with immediate JavaScript redirect and fallback button
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <title>Payment Successful - Opening App...</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-tap-highlight-color: transparent;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: white;
              }
              .container {
                text-align: center;
                max-width: 400px;
                width: 100%;
              }
              .success-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
              }
              h1 {
                font-size: 2rem;
                margin-bottom: 0.5rem;
                font-weight: 700;
              }
              .subtitle {
                font-size: 1.1rem;
                margin-bottom: 2rem;
                opacity: 0.95;
              }
              .spinner {
                display: inline-block;
                width: 40px;
                height: 40px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 2rem;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
              .open-app-btn {
                display: block;
                width: 100%;
                max-width: 300px;
                margin: 1rem auto;
                padding: 18px 30px;
                background: white;
                color: #667eea;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 700;
                font-size: 1.2rem;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
                transition: all 0.2s;
                touch-action: manipulation;
              }
              .open-app-btn:active {
                transform: scale(0.95);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
              }
              .fallback-link {
                display: block;
                margin-top: 1rem;
                padding: 12px 20px;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 0.9rem;
                border: 2px solid white;
              }
              .booking-info {
                margin-top: 1.5rem;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                font-size: 0.9rem;
              }
              @media (max-width: 480px) {
                h1 { font-size: 1.5rem; }
                .subtitle { font-size: 1rem; }
                .open-app-btn { font-size: 1.1rem; padding: 16px 25px; }
              }
            </style>
            <script>
              (function() {
                console.log('[PaymentRedirect] 🔵 ========== REDIRECT PAGE LOADED ==========');
                
                var deepLink = "${deepLinkUrl}";
                var intentUrl = "${androidIntentUrl}";
                var isAndroid = ${isAndroid};
                var isIOS = ${isIOS};
                var targetUrl = isAndroid ? intentUrl : deepLink;
                var redirectAttempted = false;
                
                // Better mobile detection on client side
                var clientIsAndroid = /Android/i.test(navigator.userAgent) || 
                                      /Android/i.test(navigator.platform) ||
                                      navigator.userAgent.includes('wv'); // WebView indicator
                var clientIsIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                                  /iPhone|iPad|iPod/i.test(navigator.platform);
                
                // Use client-side detection if server-side failed
                var effectiveIsAndroid = isAndroid || clientIsAndroid;
                var effectiveIsIOS = isIOS || clientIsIOS;
                var effectiveTargetUrl = effectiveIsAndroid ? intentUrl : deepLink;
                
                console.log('[PaymentRedirect] 📋 Configuration:', {
                  deepLink: deepLink,
                  intentUrl: intentUrl,
                  serverIsAndroid: isAndroid,
                  serverIsIOS: isIOS,
                  clientIsAndroid: clientIsAndroid,
                  clientIsIOS: clientIsIOS,
                  effectiveIsAndroid: effectiveIsAndroid,
                  effectiveIsIOS: effectiveIsIOS,
                  targetUrl: targetUrl,
                  effectiveTargetUrl: effectiveTargetUrl,
                  userAgent: navigator.userAgent,
                  platform: navigator.platform,
                  vendor: navigator.vendor,
                });
                
                function openApp() {
                  if (redirectAttempted) {
                    console.log('[PaymentRedirect] ⚠️  Redirect already attempted, skipping');
                    return;
                  }
                  redirectAttempted = true;
                  
                  // Use effective target URL (with client-side detection)
                  var urlToUse = effectiveTargetUrl;
                  
                  console.log('[PaymentRedirect] 🚀 Attempting to open app with URL:', urlToUse);
                  console.log('[PaymentRedirect] 📱 Device info:', {
                    isAndroid: effectiveIsAndroid,
                    isIOS: effectiveIsIOS,
                    usingIntent: effectiveIsAndroid,
                    usingDeepLink: !effectiveIsAndroid,
                  });
                  
                  // Try multiple methods for maximum compatibility
                  var methods = [];
                  
                  try {
                    // Method 1: Direct location assignment (use effective URL)
                    console.log('[PaymentRedirect] 🔄 Method 1: window.location.href');
                    window.location.href = urlToUse;
                    methods.push('location.href');
                  } catch(e) {
                    console.error('[PaymentRedirect] ❌ Method 1 failed:', e);
                  }
                  
                  try {
                    // Method 2: window.location
                    console.log('[PaymentRedirect] 🔄 Method 2: window.location');
                    window.location = urlToUse;
                    methods.push('location');
                  } catch(e) {
                    console.error('[PaymentRedirect] ❌ Method 2 failed:', e);
                  }
                  
                  try {
                    // Method 3: window.location.replace
                    console.log('[PaymentRedirect] 🔄 Method 3: window.location.replace');
                    window.location.replace(urlToUse);
                    methods.push('location.replace');
                  } catch(e) {
                    console.error('[PaymentRedirect] ❌ Method 3 failed:', e);
                  }
                  
                  try {
                    // Method 4: Create and click invisible link
                    console.log('[PaymentRedirect] 🔄 Method 4: Programmatic link click');
                    var link = document.createElement('a');
                    link.href = urlToUse;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(function() {
                      try { document.body.removeChild(link); } catch(e) {}
                    }, 100);
                    methods.push('link.click');
                  } catch(e) {
                    console.error('[PaymentRedirect] ❌ Method 4 failed:', e);
                  }
                  
                  // Always try direct deep link first (works for both dev and production)
                  // Intent URLs redirect to Play Store if app not found, which is bad for dev
                  try {
                    console.log('[PaymentRedirect] 🔄 Fallback: direct deep link (works for dev apps)');
                    window.location.href = deepLink;
                    methods.push('direct-deeplink-fallback');
                  } catch(e) {
                    console.error('[PaymentRedirect] ❌ Direct deep link fallback failed:', e);
                  }
                  
                  // Also try Intent URL for Android (only if direct link didn't work)
                  if (effectiveIsAndroid) {
                    try {
                      console.log('[PaymentRedirect] 🔄 Android Intent URL fallback');
                      setTimeout(function() {
                        window.location.href = intentUrl;
                      }, 300);
                      methods.push('android-intent-fallback');
                    } catch(e) {
                      console.error('[PaymentRedirect] ❌ Android Intent fallback failed:', e);
                    }
                  }
                  
                  console.log('[PaymentRedirect] ✅ Redirect methods attempted:', methods);
                  
                  // If we're on desktop, show a message
                  if (!effectiveIsAndroid && !effectiveIsIOS) {
                    console.warn('[PaymentRedirect] ⚠️  Desktop browser detected - deep link may not work');
                    var desktopMsg = document.getElementById('desktop-message');
                    if (desktopMsg) {
                      desktopMsg.style.display = 'block';
                    }
                  } else {
                    console.log('[PaymentRedirect] ✅ Mobile device detected - deep link should work');
                  }
                }
                
                // Log page state
                console.log('[PaymentRedirect] 📄 Document ready state:', document.readyState);
                
                // Wait a bit for page to render before attempting redirect
                // This ensures the user sees the page content and button
                // Use direct deep link first (better for dev apps)
                setTimeout(function() {
                  console.log('[PaymentRedirect] 🚀 First redirect attempt (500ms delay) - trying direct deep link first...');
                  try {
                    window.location.href = deepLink;
                    console.log('[PaymentRedirect] ✅ Direct deep link attempted');
                  } catch(e) {
                    console.error('[PaymentRedirect] ❌ Direct deep link failed, trying full redirect...');
                    openApp();
                  }
                }, 500);
                
                // More attempts on page load
                if (document.readyState === 'loading') {
                  console.log('[PaymentRedirect] ⏳ Waiting for DOMContentLoaded...');
                  document.addEventListener('DOMContentLoaded', function() {
                    console.log('[PaymentRedirect] ✅ DOMContentLoaded fired, attempting redirect in 300ms...');
                    setTimeout(function() {
                      openApp();
                    }, 300);
                  });
                } else {
                  console.log('[PaymentRedirect] ✅ DOM already loaded, attempting redirect in 300ms...');
                  setTimeout(function() {
                    openApp();
                  }, 300);
                }
                
                window.onload = function() {
                  console.log('[PaymentRedirect] ✅ window.onload fired, attempting redirect...');
                  openApp();
                };
                
                // Additional attempts with delays (for mobile browsers that need multiple tries)
                setTimeout(function() {
                  console.log('[PaymentRedirect] ⏰ 1000ms delayed redirect attempt...');
                  openApp();
                }, 1000);
                setTimeout(function() {
                  console.log('[PaymentRedirect] ⏰ 1500ms delayed redirect attempt...');
                  openApp();
                }, 1500);
                
                // Make function globally available for button clicks
                window.openApp = function() {
                  console.log('[PaymentRedirect] 👆 Manual button click - opening app with direct deep link...');
                  redirectAttempted = false; // Allow retry on button click
                  
                  // Use direct deep link for manual clicks (works better for dev apps)
                  try {
                    console.log('[PaymentRedirect] 🔄 Button click: Using direct deep link:', deepLink);
                    window.location.href = deepLink;
                    setTimeout(function() {
                      window.location = deepLink;
                    }, 100);
                    setTimeout(function() {
                      window.location.replace(deepLink);
                    }, 200);
                  } catch(e) {
                    console.error('[PaymentRedirect] ❌ Button click failed:', e);
                  }
                };
                
                // Separate function for Intent URL (for Play Store published apps)
                window.openAppIntent = function() {
                  console.log('[PaymentRedirect] 👆 Manual button click - opening app with Intent URL...');
                  try {
                    console.log('[PaymentRedirect] 🔄 Button click: Using Intent URL:', intentUrl);
                    window.location.href = intentUrl;
                    setTimeout(function() {
                      window.location = intentUrl;
                    }, 100);
                  } catch(e) {
                    console.error('[PaymentRedirect] ❌ Intent URL click failed:', e);
                  }
                };
                
                console.log('[PaymentRedirect] ✅ Redirect script initialized');
              })();
            </script>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✓</div>
              <h1>Payment Successful!</h1>
              <p class="subtitle">Opening your app...</p>
              ${bookingId ? `<div class="booking-info">Booking ID: ${bookingId}</div>` : ''}
              <div class="spinner"></div>
              <p style="margin-bottom: 1rem; opacity: 0.9;">If the app doesn't open automatically, tap below:</p>
              <a href="${deepLinkUrl}" onclick="window.openApp(); return false;" class="open-app-btn" style="display: block !important; visibility: visible !important;">
                📱 Open App Now
              </a>
              ${isAndroid ? `<a href="${androidIntentUrl}" onclick="window.openAppIntent(); return false;" class="fallback-link" style="display: block; margin-top: 0.5rem;">
                🔄 Try Intent Link (Android)
              </a>` : ''}
              <div id="desktop-message" style="display: none; margin-top: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.2); border-radius: 8px; font-size: 0.9rem;">
                <p>⚠️ Desktop browser detected. Deep links work on mobile devices.</p>
                <p style="margin-top: 0.5rem; font-family: monospace; font-size: 0.8rem; word-break: break-all;">${deepLinkUrl}</p>
              </div>
              <div style="margin-top: 1rem; padding: 0.5rem; background: rgba(0, 0, 0, 0.2); border-radius: 4px; font-size: 0.75rem; font-family: monospace; opacity: 0.7;">
                <p>Check browser console (F12) for redirect logs</p>
              </div>
            </div>
          </body>
        </html>
      `);
      return;
    } else {
      // Payment failed - return HTML page with JavaScript redirect
      const failedQueryParams = `merchantRefId=${encodeURIComponent(merchantRefId as string)}`;
      const failedDeepLink = `parcelbooking://payment/failed?${failedQueryParams}`;
      const userAgent = req.headers["user-agent"] || "";
      const isAndroid = userAgent.includes("Android");
      const failedIntentUrl = `intent://payment/failed?${failedQueryParams}#Intent;scheme=parcelbooking;package=com.ratlam.parcelbooking;end`;
      const failedRedirectUrl = isAndroid ? failedIntentUrl : failedDeepLink;
      
      console.log(`[PaymentSuccess] 🔗 Payment failed - generating redirect:`, {
        userAgent: userAgent,
        isAndroid: isAndroid,
        failedDeepLink: failedDeepLink,
        failedIntentUrl: failedIntentUrl,
        selectedRedirectUrl: failedRedirectUrl,
      });
      
      console.log(`[PaymentSuccess] 📄 Returning HTML redirect page for failed payment: ${failedRedirectUrl}`);
      
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <title>Payment Failed - Opening App...</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-tap-highlight-color: transparent;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: white;
              }
              .container {
                text-align: center;
                max-width: 400px;
                width: 100%;
              }
              .error-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
              }
              h1 {
                font-size: 2rem;
                margin-bottom: 0.5rem;
                font-weight: 700;
              }
              .subtitle {
                font-size: 1.1rem;
                margin-bottom: 2rem;
                opacity: 0.95;
              }
              .open-app-btn {
                display: block;
                width: 100%;
                max-width: 300px;
                margin: 1rem auto;
                padding: 18px 30px;
                background: white;
                color: #f5576c;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 700;
                font-size: 1.2rem;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
                transition: all 0.2s;
                touch-action: manipulation;
              }
              .open-app-btn:active {
                transform: scale(0.95);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
              }
            </style>
            <script>
              (function() {
                var deepLink = "${failedDeepLink}";
                var intentUrl = "${failedIntentUrl}";
                var isAndroid = ${isAndroid};
                var targetUrl = isAndroid ? intentUrl : deepLink;
                
                function openApp() {
                  try { window.location.href = targetUrl; } catch(e) {}
                  try { window.location = targetUrl; } catch(e) {}
                  try { window.location.replace(targetUrl); } catch(e) {}
                  try {
                    var link = document.createElement('a');
                    link.href = targetUrl;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(function() {
                      try { document.body.removeChild(link); } catch(e) {}
                    }, 100);
                  } catch(e) {}
                }
                
                openApp();
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', openApp);
                }
                window.onload = openApp;
                setTimeout(openApp, 100);
                setTimeout(openApp, 300);
                
                window.openApp = openApp;
              })();
            </script>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">✗</div>
              <h1>Payment Failed</h1>
              <p class="subtitle">Opening your app...</p>
              <a href="${failedRedirectUrl}" onclick="window.openApp(); return false;" class="open-app-btn">
                📱 Open App
              </a>
            </div>
          </body>
        </html>
      `);
      return;
    }
  } catch (error: any) {
    console.error(`[PaymentSuccess] ❌ ========== ERROR ==========`);
    console.error(`[PaymentSuccess] ❌ Error details:`, {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500,
      merchantRefId: req.query.merchantRefId,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    next(error);
  }
};

/**
 * Payment failed redirect handler
 * GET /payments/failed
 */
export const paymentFailed = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { merchantRefId } = req.query;

    if (!merchantRefId) {
      throw createError("Missing required parameters", 400);
    }

    // Check if this is an API request (from app) or browser request
    const isApiRequest = req.headers["accept"]?.includes("application/json") || 
                         req.headers["user-agent"]?.includes("okhttp") ||
                         req.headers["user-agent"]?.includes("ReactNative") ||
                         req.headers["x-requested-with"] === "XMLHttpRequest";

    if (isApiRequest) {
      res.json({
        success: false,
        message: "Payment failed",
        merchantRefId: merchantRefId as string,
      });
      return;
    }

    // For browser requests, redirect to app using HTTP 302 redirect
    const queryParams = `merchantRefId=${encodeURIComponent(merchantRefId as string)}`;
    const deepLinkUrl = `parcelbooking://payment/failed?${queryParams}`;
    
    const userAgent = req.headers["user-agent"] || "";
    const isAndroid = userAgent.includes("Android");
    
    const redirectUrl = isAndroid 
      ? `intent://payment/failed?${queryParams}#Intent;scheme=parcelbooking;package=com.ratlam.parcelbooking;end`
      : deepLinkUrl;
    
    console.log(`[PaymentFailed] Redirecting browser to app: ${redirectUrl}`);
    res.redirect(302, redirectUrl);
    return;
  } catch (error: any) {
    console.error(`[PaymentFailed] ❌ ERROR:`, error.message);
    next(error);
  }
};

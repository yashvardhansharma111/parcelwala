/**
 * Notification Service
 * Handles push notifications using OneSignal (Free & Easy)
 */

import axios from "axios";
import * as admin from "firebase-admin";
import { db } from "../config/firebase";
import { createError } from "../utils/errorHandler";
import { BookingStatus } from "./bookingService";
import { AppCreds } from "../config/creds";

interface NotificationData {
  title: string;
  body: string;
  data?: any;
}

/**
 * OneSignal API endpoints
 */
const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";
const ONESIGNAL_PLAYERS_API_URL = "https://onesignal.com/api/v1/players";

/**
 * Create or update OneSignal player with external user ID
 * This registers the user in OneSignal so we can send notifications
 * 
 * IMPORTANT: OneSignal requires users to be registered before sending notifications
 * We'll create a "placeholder" player with just the external user ID
 * The actual push token will be registered when the OneSignal SDK is used
 */
const createOrUpdateOneSignalPlayer = async (
  userId: string,
  pushToken: string,
  platform: "ios" | "android" = "android"
): Promise<void> => {
  try {
    if (!AppCreds.onesignal.appId || !AppCreds.onesignal.restApiKey) {
      console.warn("OneSignal credentials not configured, skipping player registration");
      return;
    }

    // Check if this is an Expo Push Token
    const isExpoToken = pushToken.startsWith("ExponentPushToken[");
    
    if (isExpoToken) {
      // Expo Push Tokens can't be used directly with OneSignal REST API
      // OneSignal needs native FCM/APNS tokens
      // However, we can still create a player with just the external user ID
      // The player will be "unsubscribed" until the OneSignal SDK registers it properly
      
      console.log(`📝 Creating OneSignal player for user ${userId} with external user ID only`);
      console.log(`⚠️ Note: Expo Push Token detected. Player will need OneSignal SDK to be fully subscribed.`);
      
      // Try to create a player with external user ID
      // This will at least register the user in OneSignal's system
      try {
        const playerData: any = {
          app_id: AppCreds.onesignal.appId,
          external_user_id: userId, // Link Firebase UID as external user ID
          device_type: platform === "ios" ? 0 : 1, // 0 = iOS, 1 = Android
          // Note: We can't provide identifier (FCM token) because we only have Expo token
          // This player will be "unsubscribed" until OneSignal SDK registers it
        };

        const response = await axios.post(
          ONESIGNAL_PLAYERS_API_URL,
          playerData,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${AppCreds.onesignal.restApiKey}`,
            },
            timeout: 10000,
          }
        );

        if (response.data.id) {
          console.log(`✅ OneSignal player created/updated for user ${userId}:`, response.data.id);
        } else {
          console.warn(`⚠️ OneSignal player creation returned no ID for user ${userId}`);
        }
      } catch (apiError: any) {
        // If player already exists, try to update it
        if (apiError.response?.status === 400) {
          console.log(`📝 Player might already exist for user ${userId}, attempting update...`);
          // OneSignal will auto-update when we send notifications with external_user_id
        } else {
          console.error("Error creating OneSignal player:", apiError.response?.data || apiError.message);
        }
      }
    } else {
      // This might be a native FCM token or OneSignal Player ID
      console.log(`📝 Registering native token/Player ID for user ${userId}`);
      
      // If this is a OneSignal Player ID (UUID format), update the player to set external_user_id
      const isOneSignalPlayerId = pushToken.length === 36 && pushToken.includes("-");
      
      if (isOneSignalPlayerId) {
        console.log(`📝 Updating OneSignal player ${pushToken.substring(0, 8)}... with external_user_id: ${userId}`);
        
        try {
          // Update the existing player to set external_user_id
          // This allows us to send notifications even if player is not subscribed
          const updateData: any = {
            app_id: AppCreds.onesignal.appId,
            external_user_id: userId, // Set Firebase UID as external user ID
          };

          const response = await axios.put(
            `${ONESIGNAL_PLAYERS_API_URL}/${pushToken}`,
            updateData,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${AppCreds.onesignal.restApiKey}`,
              },
              timeout: 10000,
            }
          );

          if (response.data.success !== false) {
            console.log(`✅ OneSignal player updated with external_user_id for user ${userId}`);
          } else {
            console.warn(`⚠️ OneSignal player update returned:`, response.data);
          }
        } catch (updateError: any) {
          // If player doesn't exist or update fails, try to create it
          if (updateError.response?.status === 404 || updateError.response?.status === 400) {
            console.log(`📝 Player might not exist, attempting to create with external_user_id...`);
            try {
              const playerData: any = {
                app_id: AppCreds.onesignal.appId,
                id: pushToken, // Use the Player ID as the player ID
                external_user_id: userId,
                device_type: platform === "ios" ? 0 : 1,
              };

              const createResponse = await axios.post(
                ONESIGNAL_PLAYERS_API_URL,
                playerData,
                {
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${AppCreds.onesignal.restApiKey}`,
                  },
                  timeout: 10000,
                }
              );

              if (createResponse.data.id) {
                console.log(`✅ OneSignal player created/updated with external_user_id for user ${userId}`);
              }
            } catch (createError: any) {
              console.log(`⚠️ Could not create/update player, but external_user_id will work for notifications:`, createError.message);
            }
          } else {
            console.error("Error updating OneSignal player:", updateError.response?.data || updateError.message);
          }
        }
      } else {
        // For other token types, create player with external_user_id only
        console.log(`📝 Creating OneSignal player with external_user_id for user ${userId}`);
        try {
          const playerData: any = {
            app_id: AppCreds.onesignal.appId,
            external_user_id: userId,
            device_type: platform === "ios" ? 0 : 1,
          };

          const response = await axios.post(
            ONESIGNAL_PLAYERS_API_URL,
            playerData,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${AppCreds.onesignal.restApiKey}`,
              },
              timeout: 10000,
            }
          );

          if (response.data.id) {
            console.log(`✅ OneSignal player created with external_user_id for user ${userId}:`, response.data.id);
          }
        } catch (apiError: any) {
          if (apiError.response?.status === 400) {
            console.log(`📝 Player might already exist for user ${userId}`);
          } else {
            console.error("Error creating OneSignal player:", apiError.response?.data || apiError.message);
          }
        }
      }
    }
    
  } catch (error: any) {
    console.error("Error in createOrUpdateOneSignalPlayer:", error);
    // Don't throw - this is not critical, notifications might still work
  }
};

/**
 * Save push token for user (can be OneSignal Player ID or Expo Push Token)
 * We'll use external user IDs with OneSignal, so we just need to store the user ID
 */
export const saveFCMToken = async (
  userId: string,
  token: string
): Promise<void> => {
  try {
    // Validate token format
    if (!token || typeof token !== "string" || token.length < 10) {
      throw createError("Invalid token format", 400);
    }

    console.log(`📝 Saving push token for user ${userId}:`, {
      tokenPrefix: token.substring(0, 20) + "...",
      tokenLength: token.length,
    });

    // Store token in Firestore
    // OneSignal Player IDs are UUIDs (36 chars), Expo tokens are longer
    const isOneSignalPlayerId = token.length === 36 && token.includes("-");
    
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    if (isOneSignalPlayerId) {
      // Store as oneSignalPlayerId (preferred for OneSignal SDK)
      updateData.oneSignalPlayerId = token;
      console.log(`[OneSignal] Storing as oneSignalPlayerId: ${token.substring(0, 8)}...`);
    } else {
      // Store as pushToken (fallback for Expo tokens or other formats)
      updateData.pushToken = token;
      console.log(`[OneSignal] Storing as pushToken: ${token.substring(0, 20)}...`);
    }
    
    await db.collection("users").doc(userId).update(updateData);

    console.log(`✅ Push token saved for user: ${userId}`);
    
    // Try to register with OneSignal (non-blocking)
    await createOrUpdateOneSignalPlayer(userId, token);
  } catch (error: any) {
    console.error("Error saving push token:", error);
    throw createError("Failed to save push token", 500);
  }
};

/**
 * Get user's OneSignal Player ID from Firestore
 */
const getUserOneSignalPlayerId = async (userId: string): Promise<string | null> => {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }
    const userData = userDoc.data();
    // Check for oneSignalPlayerId (from SDK) or pushToken (fallback)
    return userData?.oneSignalPlayerId || userData?.pushToken || null;
  } catch (error) {
    console.error("Error getting OneSignal Player ID:", error);
    return null;
  }
};

/**
 * Send notification via OneSignal using Player IDs or external user IDs
 */
const sendOneSignalNotification = async (
  playerIdsOrExternalIds: string[],
  notification: NotificationData,
  useExternalIds: boolean = false
): Promise<{ sent: number; failed: number }> => {
  try {
    if (!AppCreds.onesignal.appId || !AppCreds.onesignal.restApiKey) {
      throw createError("OneSignal credentials not configured", 500);
    }

    const message: any = {
      app_id: AppCreds.onesignal.appId,
      headings: { en: notification.title || "Notification" },
      contents: { en: notification.body || "" },
      data: {
        ...(notification.data || {}),
        title: notification.title,
        body: notification.body,
      },
      priority: 10, // High priority
    };

    // Use Player IDs if available, otherwise fall back to external user IDs
    if (useExternalIds) {
      message.include_external_user_ids = playerIdsOrExternalIds;
    } else {
      message.include_player_ids = playerIdsOrExternalIds;
    }

    // Only add android_channel_id if it exists in OneSignal
    // For now, we'll let OneSignal use the default channel
    // If you create a custom channel in OneSignal dashboard, add it here:
    // message.android_channel_id = "your-channel-id";

    console.log(`📤 Sending OneSignal notification to ${playerIdsOrExternalIds.length} users:`, {
      title: notification.title,
      body: notification.body,
      method: useExternalIds ? "external_user_ids" : "player_ids",
    });

    const response = await axios.post(
      ONESIGNAL_API_URL,
      message,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${AppCreds.onesignal.restApiKey}`,
        },
        timeout: 10000,
      }
    );

    // Check for warnings about unsubscribed users
    if (response.data.warnings?.invalid_external_user_ids) {
      const unsubscribedUsers = response.data.warnings.invalid_external_user_ids;
      console.log(`ℹ️  Some users are unsubscribed: ${unsubscribedUsers} - this is expected if permissions not granted`);
      // Continue to check errors below
    }

    // Check response for errors
    if (response.data.errors && response.data.errors.length > 0) {
      const errorMessages = response.data.errors.map((e: any) => typeof e === 'string' ? e : e.message || JSON.stringify(e));
      
      // Check if error is "not subscribed" - this is recoverable
      const hasNotSubscribedError = errorMessages.some((msg: string) => 
        msg.toLowerCase().includes("not subscribed") ||
        msg.toLowerCase().includes("unsubscribed")
      );
      
      if (hasNotSubscribedError) {
        // This is expected - user hasn't granted permissions or SDK hasn't initialized
        // Don't log as error, just as info
        console.log(`ℹ️  Players are not subscribed - user may need to grant notification permissions in app`);
        // If we have a successful response ID, count as sent (OneSignal accepted the request)
        // Only count unsubscribed users as failed if we can determine the count
        if (response.data.id) {
          // OneSignal accepted the request, so notifications were queued/sent
          // Unsubscribed users won't receive it, but the request was successful
          const unsubscribedCount = response.data.warnings?.invalid_external_user_ids?.length || 0;
          const sent = playerIdsOrExternalIds.length - unsubscribedCount;
          return { sent, failed: unsubscribedCount };
        }
        // If no ID, the entire request failed
        return { sent: 0, failed: playerIdsOrExternalIds.length };
      }
      
      // For other errors, log as error
      console.error("❌ OneSignal API Errors:", errorMessages);
      // Log full response for debugging (but not for unsubscribed errors)
      console.error("📋 Full OneSignal Response:", JSON.stringify(response.data, null, 2));
      return { sent: 0, failed: playerIdsOrExternalIds.length };
    }

    // If we have a successful response ID, the notification was accepted by OneSignal
    if (response.data.id) {
      console.log("✅ OneSignal notification sent successfully:", response.data.id);
      console.log("📊 Response:", {
        id: response.data.id,
        recipients: response.data.recipients,
        errors: response.data.errors,
        warnings: response.data.warnings,
      });
      
      // OneSignal successfully accepted the notification request
      // When OneSignal returns an ID, it means the notification was queued/sent successfully
      // The key insight: If OneSignal accepted the request (returned an ID), the notification
      // was sent to all valid subscribers. Warnings about invalid IDs are informational only.
      
      // Priority 1: Use recipients count if available (most accurate)
      if (response.data.recipients !== undefined && response.data.recipients !== null) {
        const recipients = typeof response.data.recipients === 'number' 
          ? response.data.recipients 
          : parseInt(String(response.data.recipients), 10) || 0;
        const sent = Math.max(0, Math.min(recipients, playerIdsOrExternalIds.length));
        const failed = Math.max(0, playerIdsOrExternalIds.length - sent);
        console.log(`ℹ️  OneSignal reported ${recipients} recipients out of ${playerIdsOrExternalIds.length} users`);
        return { sent, failed };
      }
      
      // Priority 2: If no recipients count, assume all were sent
      // Key insight: If OneSignal returned an ID, it means the notification request was accepted
      // Warnings about invalid IDs are informational only - they don't mean the notification failed
      // The notification was queued/sent to all valid subscribers
      // Only actual errors (in the errors array) should be counted as failures
      console.log(`ℹ️  OneSignal accepted notification request - counting all ${playerIdsOrExternalIds.length} as sent`);
      console.log(`ℹ️  Note: Warnings about invalid IDs are informational only and don't indicate failure`);
      return { sent: playerIdsOrExternalIds.length, failed: 0 };
    }

    // No ID means the request wasn't accepted
    return { sent: 0, failed: playerIdsOrExternalIds.length };
  } catch (error: any) {
    console.error("❌ Error sending OneSignal notification:", error);
    if (error.response?.data) {
      console.error("OneSignal API Error Response:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error details:", error.message);
    }
    throw createError(`Failed to send notification: ${error.message || "Unknown error"}`, 500);
  }
};

/**
 * Send notification to specific user
 * Tries Player ID first, falls back to external user ID
 */
export const sendNotificationToUser = async (
  userId: string,
  notification: NotificationData
): Promise<void> => {
  try {
    console.log(`[sendNotificationToUser] 📤 Attempting to send notification to user ${userId}:`, {
      title: notification.title,
      body: notification.body,
    });
    
    // Try to get Player ID first
    const playerId = await getUserOneSignalPlayerId(userId);
    
    if (playerId) {
      // Try Player ID first
      console.log(`[sendNotificationToUser] 📤 Attempting to send to user ${userId} using Player ID: ${playerId.substring(0, 8)}...`);
      try {
        const result = await sendOneSignalNotification([playerId], notification, false);
        
        // Check if notification was sent successfully
        if (result.sent > 0) {
          console.log(`[sendNotificationToUser] ✅ Notification sent successfully to user ${userId} using Player ID (sent: ${result.sent}, failed: ${result.failed})`);
          return;
        }
        
        // If failed, check if it's because player is not subscribed
        console.log(`[sendNotificationToUser] ⚠️  Notification failed with Player ID (sent: ${result.sent}, failed: ${result.failed})`);
        console.log(`[sendNotificationToUser] 📤 Falling back to external user ID for user ${userId}`);
      } catch (playerIdError: any) {
        // If Player ID method fails, fall back to external user ID
        console.log(`[sendNotificationToUser] ⚠️  Player ID method failed: ${playerIdError.message}`);
        console.log(`[sendNotificationToUser] 📤 Falling back to external user ID for user ${userId}`);
      }
    } else {
      console.log(`[sendNotificationToUser] ℹ️  No Player ID found for user ${userId}, using external user ID`);
    }
    
    // Fall back to external user ID (Firebase UID)
    // This works even if the player is not subscribed, as long as external_user_id is set
    console.log(`[sendNotificationToUser] 📤 Sending to user ${userId} using external user ID`);
    try {
      const result = await sendOneSignalNotification([userId], notification, true);
      if (result.sent > 0) {
        console.log(`[sendNotificationToUser] ✅ Notification sent successfully to user ${userId} using external user ID (sent: ${result.sent}, failed: ${result.failed})`);
      } else {
        console.warn(`[sendNotificationToUser] ⚠️  Notification failed with external user ID for user ${userId} (sent: ${result.sent}, failed: ${result.failed})`);
        console.warn(`[sendNotificationToUser] ℹ️  This may be because the user is not subscribed to notifications or doesn't have OneSignal Player ID registered`);
      }
    } catch (externalIdError: any) {
      // Check if it's an unsubscribed error - this is expected and not critical
      const isUnsubscribedError = externalIdError.message?.toLowerCase().includes("unsubscribed") ||
                                   externalIdError.response?.data?.warnings?.invalid_external_user_ids;
      
      if (isUnsubscribedError) {
        console.log(`[sendNotificationToUser] ℹ️  User ${userId} is not subscribed to notifications - this is expected if permissions not granted`);
      } else {
        console.error(`[sendNotificationToUser] ❌ Both Player ID and external user ID methods failed for user ${userId}`);
        console.error(`[sendNotificationToUser] Error details:`, externalIdError.message);
      }
      // Don't throw - notification failure shouldn't break the flow
    }
  } catch (error: any) {
    console.error("Error sending notification to user:", error);
    // Don't throw - notification failure shouldn't break the flow
    console.error("Notification will be skipped, but operation will continue");
  }
};

/**
 * Broadcast notification to all users with OneSignal Player IDs
 */
/**
 * Broadcast notification to all users
 * Uses Player IDs when available, falls back to external user IDs
 */
export const broadcastNotification = async (
  notification: NotificationData
): Promise<{ sent: number; failed: number; total: number }> => {
  try {
    // Get all users
    const usersSnapshot = await db.collection("users").get();

    console.log(`[broadcastNotification] Found ${usersSnapshot.size} users`);

    if (usersSnapshot.empty) {
      console.warn("[broadcastNotification] No users found.");
      return { sent: 0, failed: 0, total: 0 };
    }

    // Separate users with Player IDs and those without
    const playerIds: string[] = [];
    const externalUserIds: string[] = [];

    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data();
      
      // Check for OneSignal Player ID (UUID format: 36 chars with dashes)
      // Priority: oneSignalPlayerId first, then check if pushToken is a Player ID
      let playerId: string | null = null;
      
      if (userData?.oneSignalPlayerId) {
        // Check if it's a valid UUID format (36 chars with dashes)
        const isPlayerId = userData.oneSignalPlayerId.length === 36 && userData.oneSignalPlayerId.includes("-");
        if (isPlayerId) {
          playerId = userData.oneSignalPlayerId;
        }
      }
      
      // If no oneSignalPlayerId, check if pushToken is a Player ID
      if (!playerId && userData?.pushToken) {
        const isPlayerId = userData.pushToken.length === 36 && userData.pushToken.includes("-");
        if (isPlayerId) {
          playerId = userData.pushToken;
        }
      }
      
      if (playerId) {
        // Valid OneSignal Player ID found
        playerIds.push(playerId);
      } else {
        // No Player ID available, use external user ID (Firebase UID)
        externalUserIds.push(doc.id);
      }
    });

    console.log(`[broadcastNotification] 📊 User breakdown: ${playerIds.length} users with Player IDs, ${externalUserIds.length} users with external IDs (total: ${usersSnapshot.size})`);

    let totalSent = 0;
    let totalFailed = 0;
    const batchSize = 2000;

    // Send to users with Player IDs first (more reliable)
    if (playerIds.length > 0) {
      const totalBatches = Math.ceil(playerIds.length / batchSize);
      console.log(`[broadcastNotification] 📤 Sending to ${playerIds.length} users with Player IDs (${totalBatches} batch${totalBatches > 1 ? 'es' : ''})`);
      
      for (let i = 0; i < playerIds.length; i += batchSize) {
        const batch = playerIds.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        try {
          console.log(`[broadcastNotification] 📤 Sending batch ${batchNum}/${totalBatches} (Player IDs): ${batch.length} users`);
          const result = await sendOneSignalNotification(batch, notification, false);
          totalSent += result.sent;
          totalFailed += result.failed;
          console.log(`[broadcastNotification] ✅ Batch ${batchNum} (Player IDs): ${result.sent} sent, ${result.failed} failed`);
        } catch (error: any) {
          console.error(`[broadcastNotification] ❌ Error sending Player ID batch ${batchNum}:`, error.message || error);
          totalFailed += batch.length;
        }
      }
    } else {
      console.log(`[broadcastNotification] ⚠️  No users with Player IDs found`);
    }

    // Send to users with external IDs (fallback)
    if (externalUserIds.length > 0) {
      const totalBatches = Math.ceil(externalUserIds.length / batchSize);
      console.log(`[broadcastNotification] 📤 Sending to ${externalUserIds.length} users with external IDs (${totalBatches} batch${totalBatches > 1 ? 'es' : ''})`);
      
      for (let i = 0; i < externalUserIds.length; i += batchSize) {
        const batch = externalUserIds.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        try {
          console.log(`[broadcastNotification] 📤 Sending batch ${batchNum}/${totalBatches} (External IDs): ${batch.length} users`);
          const result = await sendOneSignalNotification(batch, notification, true);
          totalSent += result.sent;
          totalFailed += result.failed;
          console.log(`[broadcastNotification] ✅ Batch ${batchNum} (External IDs): ${result.sent} sent, ${result.failed} failed`);
        } catch (error: any) {
          console.error(`[broadcastNotification] ❌ Error sending External ID batch ${batchNum}:`, error.message || error);
          totalFailed += batch.length;
        }
      }
    } else {
      console.log(`[broadcastNotification] ⚠️  No users with external IDs found`);
    }

    console.log(`[broadcastNotification] 📊 Final result: ${totalSent} sent, ${totalFailed} failed, ${usersSnapshot.size} total users`);

    return { sent: totalSent, failed: totalFailed, total: usersSnapshot.size };
  } catch (error: any) {
    console.error("Error broadcasting notification:", error);
    throw createError("Failed to broadcast notification", 500);
  }
};

/**
 * Send booking status change notification
 */
export const sendBookingStatusNotification = async (
  userId: string,
  bookingId: string,
  trackingNumber: string | undefined,
  oldStatus: BookingStatus,
  newStatus: BookingStatus
): Promise<void> => {
  try {
    console.log(`[sendBookingStatusNotification] 📬 Starting notification for booking status change:`, {
      userId,
      bookingId,
      trackingNumber,
      oldStatus,
      newStatus,
    });
    
    const statusMessages: Record<BookingStatus, { title: string; body: string }> = {
      PendingPayment: {
        title: "Booking Created",
        body: `Your booking ${trackingNumber || bookingId} has been created and is pending payment.`,
      },
      Created: {
        title: "Booking Confirmed",
        body: `Your booking ${trackingNumber || bookingId} has been confirmed and is ready for pickup.`,
      },
      Picked: {
        title: "Parcel Picked Up",
        body: `Your parcel ${trackingNumber || bookingId} has been picked up and is on its way.`,
      },
      Shipped: {
        title: "Parcel In Transit",
        body: `Your parcel ${trackingNumber || bookingId} is now in transit to the destination.`,
      },
      Delivered: {
        title: "Parcel Delivered",
        body: `Your parcel ${trackingNumber || bookingId} has been delivered successfully!`,
      },
      Returned: {
        title: "Parcel Returned",
        body: `Your parcel ${trackingNumber || bookingId} has been returned.`,
      },
      Cancelled: {
        title: "Booking Cancelled",
        body: `Your booking ${trackingNumber || bookingId} has been cancelled.`,
      },
    };

    const message = statusMessages[newStatus];
    if (!message) {
      console.warn(`[sendBookingStatusNotification] ⚠️  No notification message for status: ${newStatus}`);
      return;
    }

    console.log(`[sendBookingStatusNotification] 📝 Notification message prepared:`, {
      title: message.title,
      body: message.body,
    });

    await sendNotificationToUser(userId, {
      title: message.title,
      body: message.body,
      data: {
        type: "booking_status_update",
        bookingId,
        trackingNumber,
        oldStatus,
        newStatus,
      },
    });
    
    console.log(`[sendBookingStatusNotification] ✅ Notification request completed for user ${userId}, booking ${bookingId}`);
  } catch (error: any) {
    // Don't throw error - notification failure shouldn't break booking flow
    console.error(`[sendBookingStatusNotification] ❌ Error sending booking status notification for user ${userId}, booking ${bookingId}:`, error);
  }
};

/**
 * Send payment status notification
 */
export const sendPaymentStatusNotification = async (
  userId: string,
  bookingId: string,
  paymentStatus: "paid" | "pending"
): Promise<void> => {
  try {
    const statusMessages: Record<"paid" | "pending", { title: string; body: string }> = {
      paid: {
        title: "Payment Received",
        body: `Your payment for booking ${bookingId} has been received successfully.`,
      },
      pending: {
        title: "Payment Pending",
        body: `Your payment for booking ${bookingId} is still pending. Please complete the payment.`,
      },
    };

    const message = statusMessages[paymentStatus];
    if (!message) {
      console.warn(`No notification message for payment status: ${paymentStatus}`);
      return;
    }

    await sendNotificationToUser(userId, {
      title: message.title,
      body: message.body,
      data: {
        type: "payment_status_update",
        bookingId,
        paymentStatus,
      },
    });
  } catch (error: any) {
    // Don't throw error - notification failure shouldn't break payment flow
    console.error("Error sending payment status notification:", error);
  }
};

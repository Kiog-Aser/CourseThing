import { env } from "~/env";

/**
 * Creative Fun Subscription Verification
 *
 * This module handles verification of Creative Fun subscription status.
 * In production, this would integrate with the Creative Fun API.
 * For now, it uses environment variables to simulate subscription status.
 */

/**
 * Check if a user has an active Creative Fun subscription
 * @param email - User's email address
 * @returns Promise<boolean> - True if user has active subscription
 */
export async function checkCreativeFunSubscription(email: string): Promise<boolean> {
  try {
    // In a real implementation, this would call the Creative Fun API
    // Example API call:
    // const response = await fetch(`https://api.creativefun.com/subscription/status?email=${email}`);
    // const data = await response.json();
    // return data.isActive;

    // For now, we'll use environment variables to simulate subscription status
    const subscribedEmails = (env.CREATIVE_FUN_SUBSCRIBED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    return email && subscribedEmails.includes(email.toLowerCase());
  } catch (error) {
    console.error("Error checking Creative Fun subscription:", error);
    return false;
  }
}

/**
 * Require Creative Fun subscription for premium content access
 * @param email - User's email address
 * @throws Error if user doesn't have active subscription
 */
export async function requireCreativeFunSubscription(email?: string | null): Promise<void> {
  if (!email) {
    throw new Error("Authentication required to access premium content");
  }

  const hasSubscription = await checkCreativeFunSubscription(email);
  if (!hasSubscription) {
    throw new Error("Active Creative Fun subscription required to access this content");
  }
}

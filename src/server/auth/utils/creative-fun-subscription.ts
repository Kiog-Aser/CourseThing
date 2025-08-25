import { env } from "~/env";

/**
 * CreatiFun Customer Verification
 *
 * This module handles verification of CreatiFun customer status
 * by calling the official CreatiFun customer verification API.
 */

interface CustomerVerificationResponse {
  isCustomer: boolean;
  reason?: string;
  email?: string;
  customerId?: string;
  plan?: string;
  subscriptionStatus?: string;
  protocolsPurchased?: number;
  hasGeneratedProtocols?: boolean;
  currentPeriodEnd?: string;
  lastProtocolGenerated?: string;
}

/**
 * Check if a user is a verified CreatiFun customer
 * @param email - User's email address
 * @returns Promise<boolean> - True if user is a verified customer
 */
export async function checkCreativeFunCustomer(email: string): Promise<boolean> {
  try {
    if (!email) {
      return false;
    }

    // Call the official CreatiFun customer verification API
    const apiUrl = `https://creati.fun/api/verify-customer?email=${encodeURIComponent(email)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Origin': env.NEXTAUTH_URL || 'http://localhost:3000',
        'User-Agent': 'CreatiFun-Course-Platform/1.0',
      },
      // Set a reasonable timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(`CreatiFun API error: ${response.status} ${response.statusText}`);
      return false;
    }

    const data: CustomerVerificationResponse = await response.json();

    // Return true if the user is a verified customer
    return data.isCustomer === true;
  } catch (error) {
    console.error("Error checking CreatiFun customer status:", error);
    // In case of API failure, default to false for security
    return false;
  }
}

/**
 * Require CreatiFun customer verification for premium content access
 * @param email - User's email address
 * @throws Error if user is not a verified customer
 */
export async function requireCreativeFunCustomer(email?: string | null): Promise<void> {
  if (!email) {
    throw new Error("Authentication required to access premium content");
  }

  const isCustomer = await checkCreativeFunSubscription(email);
  if (!isCustomer) {
    throw new Error("Verified CreatiFun customer account required to access this content");
  }
}

/**
 * Get detailed customer information from CreatiFun API
 * @param email - User's email address
 * @returns Promise<CustomerVerificationResponse | null> - Customer details or null if not a customer
 */
export async function getCustomerDetails(email: string): Promise<CustomerVerificationResponse | null> {
  try {
    if (!email) {
      return null;
    }

    const apiUrl = `https://creati.fun/api/verify-customer?email=${encodeURIComponent(email)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Origin': env.NEXTAUTH_URL || 'http://localhost:3000',
        'User-Agent': 'CreatiFun-Course-Platform/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`CreatiFun API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: CustomerVerificationResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting CreatiFun customer details:", error);
    return null;
  }
}

import { v4 as uuidv4 } from 'uuid';
import twilio from 'twilio';

// Generate unique request ID (for tracking verification requests)
export const generateRequestId = (): string => {
  return uuidv4();
};

// Calculate OTP expiry (10 minutes from now - Twilio default)
export const getOtpExpiry = (): Date => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

// Check if OTP is expired
export const isOtpExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

// Initialize Twilio client
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  return twilio(accountSid, authToken);
};

// Twilio Verify Service SID
const getTwilioServiceSid = (): string | null => {
  return process.env.TWILIO_VERIFY_SERVICE_SID || null;
};

// Twilio Integration - Send OTP via Verify API
export const sendOtpViaSms = async (
  phoneNumber: string,
  otp?: string // Not used with Twilio - Twilio generates OTP automatically
): Promise<{ success: boolean; message: string; verificationSid?: string }> => {
  const serviceSid = getTwilioServiceSid();
  const client = getTwilioClient();

  // If Twilio is not configured, simulate success in development
  if (!serviceSid || !client || process.env.NODE_ENV === 'development') {
    console.log(`📱 [DEV] OTP verification requested for ${phoneNumber}`);
    return { success: true, message: 'OTP sent (dev mode)' };
  }

  try {
    // Format phone number (ensure it starts with +)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    // Send verification code via Twilio Verify API
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications
      .create({
        to: formattedPhone,
        channel: 'sms',
      });

    if (verification.status === 'pending') {
      return {
        success: true,
        message: 'OTP sent successfully via SMS',
        verificationSid: verification.sid,
      };
    }

    return {
      success: false,
      message: `Verification status: ${verification.status}`,
    };
  } catch (error: any) {
    console.error('Twilio Error:', error);
    
    // Handle specific Twilio trial account errors
    if (error?.code === 21608) {
      const errorMessage = 'Phone number not verified. For Twilio trial accounts, please verify this number at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified';
      return { success: false, message: errorMessage };
    }
    
    const errorMessage = error?.message || 'Failed to send OTP via SMS';
    return { success: false, message: errorMessage };
  }
};

// Twilio Integration - Verify OTP via Verify API
export const verifyOtpWithTwilio = async (
  phoneNumber: string,
  code: string
): Promise<{ valid: boolean; message: string; status?: string }> => {
  const serviceSid = getTwilioServiceSid();
  const client = getTwilioClient();

  // If Twilio is not configured, allow bypass in development
  if (!serviceSid || !client || process.env.NODE_ENV === 'development') {
    // In dev mode, allow "123456" as bypass code
    if (code === '123456') {
      console.log(`🔓 [DEV] OTP verification bypassed for ${phoneNumber}`);
      return { valid: true, message: 'OTP verified (dev mode)' };
    }
    return { valid: false, message: 'Invalid OTP (dev mode)' };
  }

  try {
    // Format phone number (ensure it starts with +)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    // Verify the code via Twilio Verify API
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks
      .create({
        to: formattedPhone,
        code: code,
      });

    if (verificationCheck.status === 'approved' && verificationCheck.valid) {
      return {
        valid: true,
        message: 'OTP verified successfully',
        status: verificationCheck.status,
      };
    }

    return {
      valid: false,
      message: `Verification failed. Status: ${verificationCheck.status}`,
      status: verificationCheck.status,
    };
  } catch (error: any) {
    console.error('Twilio Verify Error:', error);
    const errorMessage = error?.message || 'Failed to verify OTP';
    return { valid: false, message: errorMessage };
  }
};


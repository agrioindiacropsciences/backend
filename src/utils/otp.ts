import { v4 as uuidv4 } from 'uuid';

// Generate a 4-digit OTP
export const generateOtp = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Generate unique request ID
export const generateRequestId = (): string => {
  return uuidv4();
};

// Calculate OTP expiry (5 minutes from now)
export const getOtpExpiry = (): Date => {
  return new Date(Date.now() + 5 * 60 * 1000);
};

// Check if OTP is expired
export const isOtpExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

// MSG91 Integration
export const sendOtpViaSms = async (
  phoneNumber: string,
  otp: string
): Promise<{ success: boolean; message: string }> => {
  const apiKey = process.env.MSG91_API_KEY;
  const senderId = process.env.MSG91_SENDER_ID;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  // If MSG91 is not configured, simulate success in development
  if (!apiKey || process.env.NODE_ENV === 'development') {
    console.log(`📱 [DEV] OTP for ${phoneNumber}: ${otp}`);
    return { success: true, message: 'OTP sent (dev mode)' };
  }

  try {
    const response = await fetch('https://api.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: apiKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        mobile: `91${phoneNumber}`,
        sender: senderId,
        otp,
        otp_length: 6,
        otp_expiry: 5,
      }),
    });

    const data = await response.json() as { type?: string; message?: string };

    if (data.type === 'success') {
      return { success: true, message: 'OTP sent successfully' };
    }

    return { success: false, message: data.message || 'Failed to send OTP' };
  } catch (error) {
    console.error('MSG91 Error:', error);
    return { success: false, message: 'SMS service unavailable' };
  }
};

// Verify OTP with MSG91 (optional - we're using DB verification)
export const verifyOtpWithMsg91 = async (
  phoneNumber: string,
  otp: string
): Promise<boolean> => {
  const apiKey = process.env.MSG91_API_KEY;

  if (!apiKey || process.env.NODE_ENV === 'development') {
    return true; // Skip MSG91 verification in dev
  }

  try {
    const response = await fetch(
      `https://api.msg91.com/api/v5/otp/verify?mobile=91${phoneNumber}&otp=${otp}`,
      {
        method: 'GET',
        headers: {
          authkey: apiKey,
        },
      }
    );

    const data = await response.json() as { type?: string };
    return data.type === 'success';
  } catch (error) {
    console.error('MSG91 Verify Error:', error);
    return false;
  }
};


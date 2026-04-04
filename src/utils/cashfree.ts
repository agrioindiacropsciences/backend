import axios from 'axios';

const baseURL =
  process.env.CASHFREE_BASE_URL || 'https://sandbox.cashfree.com/verification';

const clientId = process.env.CASHFREE_CLIENT_ID;
const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

const assertCashfreeConfig = () => {
  if (!clientId || !clientSecret) {
    throw new Error('Cashfree verification credentials are not configured');
  }
};

const getHeaders = () => {
  assertCashfreeConfig();
  return {
    'Content-Type': 'application/json',
    'x-client-id': clientId!,
    'x-client-secret': clientSecret!,
  };
};

const handleCashfreeError = (error: unknown): never => {
  if ((error as any)?.isAxiosError) {
    const axiosError = error as any;
    const message =
      axiosError.response?.data?.message ||
      axiosError.message ||
      'Cashfree verification failed';
    throw new Error(message);
  }

  throw error instanceof Error
    ? error
    : new Error('Cashfree verification failed');
};

export const verifyPanWithCashfree = async (
  pan: string,
  name?: string,
): Promise<Record<string, any>> => {
  try {
    const response = await axios.post(
      `${baseURL}/pan`,
      {
        pan,
        ...(name ? { name } : {}),
      },
      { headers: getHeaders() },
    );

    return response.data as Record<string, any>;
  } catch (error) {
    handleCashfreeError(error);
  }
  throw new Error('Cashfree PAN verification failed');
};

export const verifyGstinWithCashfree = async (
  gstin: string,
  businessName?: string,
): Promise<Record<string, any>> => {
  try {
    const response = await axios.post(
      `${baseURL}/gstin`,
      {
        GSTIN: gstin,
        ...(businessName ? { business_name: businessName } : {}),
      },
      { headers: getHeaders() },
    );

    return response.data as Record<string, any>;
  } catch (error) {
    handleCashfreeError(error);
  }
  throw new Error('Cashfree GST verification failed');
};

export const verifyNameMatchWithCashfree = async (
  verificationId: string,
  name1: string,
  name2: string,
): Promise<Record<string, any>> => {
  try {
    const response = await axios.post(
      `${baseURL}/name-match`,
      {
        verification_id: verificationId,
        name_1: name1,
        name_2: name2,
      },
      { headers: getHeaders() },
    );

    return response.data as Record<string, any>;
  } catch (error) {
    handleCashfreeError(error);
  }
  throw new Error('Cashfree name match verification failed');
};

export const verifyDigilockerAccount = async (
  verificationId: string,
  aadhaarNumber: string,
): Promise<Record<string, any>> => {
  try {
    const response = await axios.post(
      `${baseURL}/digilocker/verify-account`,
      {
        verification_id: verificationId,
        aadhaar_number: aadhaarNumber,
      },
      { headers: getHeaders() },
    );

    return response.data as Record<string, any>;
  } catch (error) {
    handleCashfreeError(error);
  }
  throw new Error('Cashfree DigiLocker account verification failed');
};

export const createDigilockerUrl = async (
  verificationId: string,
  redirectUrl: string,
  userFlow: 'signin' | 'signup',
): Promise<Record<string, any>> => {
  try {
    const response = await axios.post(
      `${baseURL}/digilocker`,
      {
        verification_id: verificationId,
        document_requested: ['AADHAAR'],
        redirect_url: redirectUrl,
        user_flow: userFlow,
      },
      { headers: getHeaders() },
    );

    return response.data as Record<string, any>;
  } catch (error) {
    handleCashfreeError(error);
  }
  throw new Error('Cashfree DigiLocker URL creation failed');
};

export const getDigilockerStatus = async ({
  verificationId,
  referenceId,
}: {
  verificationId?: string;
  referenceId?: string;
}): Promise<Record<string, any>> => {
  try {
    const response = await axios.get(`${baseURL}/digilocker`, {
      headers: getHeaders(),
      params: {
        ...(verificationId ? { verification_id: verificationId } : {}),
        ...(referenceId ? { reference_id: referenceId } : {}),
      },
    });

    return response.data as Record<string, any>;
  } catch (error) {
    handleCashfreeError(error);
  }
  throw new Error('Cashfree DigiLocker status fetch failed');
};

export const getDigilockerDocument = async (
  documentType: 'AADHAAR' | 'PAN' | 'DRIVING_LICENSE',
  verificationId: string,
): Promise<Record<string, any>> => {
  try {
    const response = await axios.get(
      `${baseURL}/digilocker/document/${documentType}`,
      {
        headers: getHeaders(),
        params: {
          verification_id: verificationId,
        },
      },
    );

    return response.data as Record<string, any>;
  } catch (error) {
    handleCashfreeError(error);
  }
  throw new Error('Cashfree DigiLocker document fetch failed');
};

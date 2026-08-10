import { jwtVerify } from "jose";

export interface CustomerSession {
  customerId: number;
  email: string;
  fullName: string;
}

export async function verifyCustomerToken(
  token: string | undefined
): Promise<CustomerSession | null> {
  if (!token) {
    return null;
  }

  const jwtSecret = process.env.CUSTOMER_JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      "CUSTOMER_JWT_SECRET ortam değişkeni bulunamadı."
    );
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);

    const { payload } = await jwtVerify(
      token,
      secret
    );

    const customerId = Number(payload.customerId);
    const email =
      typeof payload.email === "string"
        ? payload.email
        : "";

    const fullName =
      typeof payload.fullName === "string"
        ? payload.fullName
        : "";

    if (!customerId || !email) {
      return null;
    }

    return {
      customerId,
      email,
      fullName,
    };
  } catch (error) {
    console.error(
      "Müşteri token doğrulama hatası:",
      error
    );

    return null;
  }
}
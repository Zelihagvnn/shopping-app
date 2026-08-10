// app/backend/services/auth.service.ts
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { findCustomerByEmailFromDb } from "../repositories/customer.repository";

export async function findCustomerByEmail(email: string) {
  return await findCustomerByEmailFromDb(email);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return await bcrypt.compare(password, passwordHash);
}

export async function generateCustomerToken(customer: {
  id: number;
  email: string;
  fullName: string;
}) {
  const jwtSecret = process.env.CUSTOMER_JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("CUSTOMER_JWT_SECRET bulunamadı.");
  }

  const secret = new TextEncoder().encode(jwtSecret);

  return await new SignJWT({
    customerId: customer.id,
    email: customer.email,
    fullName: customer.fullName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

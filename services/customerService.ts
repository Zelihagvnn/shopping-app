// services/customerService.ts
import bcrypt from "bcryptjs";
import {
  findAllCustomersFromDb,
  findCustomerByEmailFromDb,
  findCustomerByIdFromDb,
  findCustomerByIdWithOrdersFromDb,
  insertCustomerToDb,
  updateCustomerProfileInDb,
} from "@/repositories/customerRepository";

export interface RegisterCustomerData {
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
}

export interface UpdateCustomerData {
  fullName: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
}

export async function getCustomerProfile(id: number) {
  return await findCustomerByIdFromDb(id);
}

export async function registerCustomer(data: RegisterCustomerData) {
  const existingCustomer = await findCustomerByEmailFromDb(data.email);

  if (existingCustomer) {
    throw new Error("Bu e-posta adresiyle daha önce kayıt olunmuş.");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  return await insertCustomerToDb({
    fullName: data.fullName,
    email: data.email,
    passwordHash,
    phone: data.phone || null,
    address: data.address || null,
    city: data.city || null,
    postalCode: data.postalCode || null,
  });
}

export async function updateCustomerProfile(
  customerId: number,
  data: UpdateCustomerData,
) {
  return await updateCustomerProfileInDb(customerId, {
    fullName: data.fullName,
    phone: data.phone || null,
    address: data.address || null,
    city: data.city || null,
    postalCode: data.postalCode || null,
  });
}

export async function getAllCustomersAdmin() {
  return await findAllCustomersFromDb();
}

export async function getCustomerByIdAdmin(id: number) {
  return await findCustomerByIdWithOrdersFromDb(id);
}

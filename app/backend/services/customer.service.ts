// app/backend/services/customer.service.ts
import bcrypt from "bcryptjs";
import { RegisterCustomerDto, UpdateCustomerDto } from "../dtos/customer.dto";
import {
  findAllCustomersFromDb,
  findCustomerByEmailFromDb,
  findCustomerByIdFromDb,
  findCustomerByIdWithOrdersFromDb,
  insertCustomerToDb,
  updateCustomerProfileInDb,
} from "../repositories/customer.repository";

export async function getCustomerProfile(id: number) {
  return await findCustomerByIdFromDb(id);
}

export async function registerCustomer(data: RegisterCustomerDto) {
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
  data: UpdateCustomerDto,
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

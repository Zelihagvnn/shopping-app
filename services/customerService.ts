import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

export async function registerCustomer(data: RegisterCustomerData) {
  const existingCustomer = await prisma.customer.findUnique({
    where: { email: data.email },
  });

  if (existingCustomer) {
    throw new Error("Bu e-posta adresiyle daha önce kayıt olunmuş.");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  return await prisma.customer.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
      createdAt: true,
    },
  });
}

export async function updateCustomerProfile(
  customerId: number,
  data: UpdateCustomerData,
) {
  return await prisma.customer.update({
    where: { id: customerId },
    data: {
      fullName: data.fullName,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
    },
  });
}

export async function getAllCustomersAdmin() {
  return await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      city: true,
      createdAt: true,
      _count: {
        select: { orders: true },
      },
    },
  });
}

export async function getCustomerByIdAdmin(id: number) {
  return await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
    },
  });
}

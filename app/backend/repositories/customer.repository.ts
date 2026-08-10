import { prisma } from "@/lib/prisma";

export async function findCustomerByEmailFromDb(email: string) {
  return await prisma.customer.findUnique({
    where: { email },
  });
}

export async function findCustomerByIdFromDb(id: number) {
  return await prisma.customer.findUnique({
    where: { id },
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

export async function insertCustomerToDb(data: {
  fullName: string;
  email: string;
  passwordHash: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
}) {
  return await prisma.customer.create({
    data,
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

export async function updateCustomerProfileInDb(
  customerId: number,
  data: {
    fullName: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
  },
) {
  return await prisma.customer.update({
    where: { id: customerId },
    data,
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

export async function findAllCustomersFromDb() {
  return await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      city: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });
}

export async function findCustomerByIdWithOrdersFromDb(id: number) {
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

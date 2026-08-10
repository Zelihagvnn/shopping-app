// app/backend/services/admin.service.ts
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import {
  findAdminByEmailFromDb,
  findAdminByIdFromDb,
  findCatalogOptionsFromDb,
  findDashboardStatsFromDb,
} from "../repositories/admin.repository";

export async function getAdminById(id: number) {
  return await findAdminByIdFromDb(id);
}

export async function loginAdmin(email: string, password?: string) {
  const admin = await findAdminByEmailFromDb(email);

  if (!admin || !admin.isActive) {
    throw new Error("Geçersiz e-posta veya şifre.");
  }

  if (password) {
    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      throw new Error("Geçersiz e-posta veya şifre.");
    }
  }

  const jwtSecret = process.env.ADMIN_JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("ADMIN_JWT_SECRET yapılandırılmamış.");
  }

  const secret = new TextEncoder().encode(jwtSecret);

  const token = await new SignJWT({
    adminId: admin.id,
    email: admin.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

  return {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
    },
  };
}

export async function getDashboardStatsAdmin() {
  const [
    productCount,
    customerCount,
    orderCount,
    todayOrderCount,
    pendingOrderCount,
    paidOrders,
    recentOrders,
  ] = await findDashboardStatsFromDb();

  const totalRevenue = paidOrders.reduce(
    (total, order) => total + Number(order.amount),
    0,
  );

  const formattedRecentOrders = recentOrders.map((order) => ({
    id: order.id,
    merchantReference: order.merchantReference,
    customerName:
      order.customer?.fullName || order.customerName || "Bilinmeyen Müşteri",
    customerEmail:
      order.customer?.email || order.customerEmail || "E-posta bulunmuyor",
    amount: Number(order.amount),
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  }));

  return {
    stats: {
      productCount,
      customerCount,
      orderCount,
      todayOrderCount,
      pendingOrderCount,
      totalRevenue,
    },
    recentOrders: formattedRecentOrders,
  };
}

export async function getCatalogOptionsAdmin() {
  const [categories, sizes, colors] = await findCatalogOptionsFromDb();
  return { categories, sizes, colors };
}

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { verifyAdminToken } from "@/lib/adminAuth";
import { verifyCustomerToken } from "@/lib/customerAuth";
import { validateCustomerRegisterInput } from "../dtos/customer.dto";
import { getAdminById } from "../services/admin.service";
import { generateCustomerToken, verifyPassword } from "../services/auth.service";
import {
  getAllCustomersAdmin,
  getCustomerByIdAdmin,
  getCustomerProfile,
  registerCustomer,
  updateCustomerProfile,
} from "../services/customer.service";

interface CustomerTokenPayload {
  customerId: number;
  email: string;
  fullName: string;
}

export const customerController = {
  login: async (request: NextRequest) => {
    try {
      const body = await request.json();
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (!email || !password) {
        return NextResponse.json(
          { status: "error", message: "E-posta adresi ve şifre zorunludur." },
          { status: 400 },
        );
      }

      const { findCustomerByEmail } = await import("../services/auth.service");
      const customer = await findCustomerByEmail(email);

      if (!customer) {
        return NextResponse.json(
          { status: "error", message: "E-posta adresi veya şifre hatalı." },
          { status: 401 },
        );
      }

      const isPasswordValid = await verifyPassword(password, customer.passwordHash);

      if (!isPasswordValid) {
        return NextResponse.json(
          { status: "error", message: "E-posta adresi veya şifre hatalı." },
          { status: 401 },
        );
      }

      const customerToken = await generateCustomerToken({
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
      });

      const response = NextResponse.json({
        status: "success",
        message: "Giriş başarılı.",
        customer: {
          id: customer.id,
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          postalCode: customer.postalCode,
        },
      });

      response.cookies.set("customerToken", customerToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    } catch (error) {
      console.error("Müşteri giriş hatası:", error);
      return NextResponse.json(
        { status: "error", message: "Giriş yapılırken bir hata oluştu." },
        { status: 500 },
      );
    }
  },

  register: async (request: NextRequest) => {
    try {
      const body = await request.json();
      const inputError = validateCustomerRegisterInput(body);

      if (inputError) {
        return NextResponse.json(
          { status: "error", message: inputError },
          { status: 400 },
        );
      }

      const customer = await registerCustomer({
        fullName: body.fullName.trim(),
        email: body.email.trim().toLowerCase(),
        password: body.password,
        phone: typeof body.phone === "string" ? body.phone.trim() : null,
        address: typeof body.address === "string" ? body.address.trim() : null,
        city: typeof body.city === "string" ? body.city.trim() : null,
        postalCode: typeof body.postalCode === "string" ? body.postalCode.trim() : null,
      });

      const customerToken = await generateCustomerToken({
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
      });

      const response = NextResponse.json(
        {
          status: "success",
          message: "Kayıt işlemi başarılı.",
          customer,
        },
        { status: 201 },
      );

      response.cookies.set("customerToken", customerToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Kayıt olunurken bir hata oluştu.";
      const status = message.includes("kayıt olunmuş") ? 409 : 400;
      return NextResponse.json({ status: "error", message }, { status });
    }
  },

  getMe: async (request: NextRequest) => {
    try {
      const token = request.cookies.get("customerToken")?.value;

      if (!token) {
        return NextResponse.json(
          { authenticated: false, customer: null },
          { status: 401 },
        );
      }

      const jwtSecret = process.env.CUSTOMER_JWT_SECRET;
      if (!jwtSecret) {
        throw new Error("CUSTOMER_JWT_SECRET bulunamadı.");
      }

      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(token, secret);

      const customerId = Number(
        (payload as unknown as CustomerTokenPayload).customerId,
      );

      if (!customerId) {
        return NextResponse.json(
          { authenticated: false, customer: null },
          { status: 401 },
        );
      }

      const customer = await getCustomerProfile(customerId);

      if (!customer) {
        return NextResponse.json(
          { authenticated: false, customer: null },
          { status: 401 },
        );
      }

      return NextResponse.json({
        authenticated: true,
        customer,
      });
    } catch (error) {
      console.error("Müşteri oturum kontrolü hatası:", error);
      return NextResponse.json(
        { authenticated: false, customer: null },
        { status: 401 },
      );
    }
  },

  updateProfile: async (request: NextRequest) => {
    try {
      const token = request.cookies.get("customerToken")?.value;
      const session = await verifyCustomerToken(token);

      if (!session) {
        return NextResponse.json(
          { status: "error", message: "Profil güncellemek için giriş yapmalısınız." },
          { status: 401 },
        );
      }

      const body = await request.json();
      const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";

      if (!fullName) {
        return NextResponse.json(
          { status: "error", message: "Ad Soyad alanı zorunludur." },
          { status: 400 },
        );
      }

      const customer = await updateCustomerProfile(session.customerId, {
        fullName,
        phone: typeof body.phone === "string" ? body.phone.trim() : null,
        address: typeof body.address === "string" ? body.address.trim() : null,
        city: typeof body.city === "string" ? body.city.trim() : null,
        postalCode: typeof body.postalCode === "string" ? body.postalCode.trim() : null,
      });

      return NextResponse.json({
        status: "success",
        message: "Profiliniz başarıyla güncellendi.",
        customer,
      });
    } catch (error) {
      console.error("Müşteri profil güncelleme hatası:", error);
      return NextResponse.json(
        { status: "error", message: "Profil güncellenirken bir hata oluştu." },
        { status: 500 },
      );
    }
  },

  getAllAdmin: async (request: NextRequest) => {
    try {
      const token = request.cookies.get("adminToken")?.value;
      const session = await verifyAdminToken(token);

      if (!session) {
        return NextResponse.json(
          { status: "error", message: "Müşterileri görüntülemek için admin girişi yapmalısınız." },
          { status: 401 },
        );
      }

      const admin = await getAdminById(session.adminId);

      if (!admin || !admin.isActive) {
        return NextResponse.json(
          { status: "error", message: "Admin hesabı bulunamadı veya aktif değil." },
          { status: 403 },
        );
      }

      const customers = await getAllCustomersAdmin();

      const formattedCustomers = customers.map((customer) => ({
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        createdAt: customer.createdAt.toISOString(),
        orderCount: customer._count.orders,
      }));

      return NextResponse.json({
        status: "success",
        customers: formattedCustomers,
      });
    } catch (error) {
      console.error("Admin müşteri listeleme hatası:", error);
      return NextResponse.json(
        { status: "error", message: "Müşteriler alınırken bir hata oluştu." },
        { status: 500 },
      );
    }
  },

  getByIdAdmin: async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ) => {
    try {
      const token = request.cookies.get("adminToken")?.value;
      const session = await verifyAdminToken(token);

      if (!session) {
        return NextResponse.json(
          { status: "error", message: "Bu işlem için admin girişi yapmalısınız." },
          { status: 401 },
        );
      }

      const admin = await getAdminById(session.adminId);

      if (!admin || !admin.isActive) {
        return NextResponse.json(
          { status: "error", message: "Admin hesabı bulunamadı veya aktif değil." },
          { status: 403 },
        );
      }

      const { id } = await context.params;
      const customerId = Number(id);

      if (!Number.isInteger(customerId) || customerId <= 0) {
        return NextResponse.json(
          { status: "error", message: "Geçerli bir müşteri kimliği gönderilmelidir." },
          { status: 400 },
        );
      }

      const customer = await getCustomerByIdAdmin(customerId);

      if (!customer) {
        return NextResponse.json(
          { status: "error", message: "Müşteri bulunamadı." },
          { status: 404 },
        );
      }

      const orders = customer.orders.map((order) => ({
        id: order.id,
        merchantReference: order.merchantReference,
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        productCount: order.items.reduce((total, item) => total + item.quantity, 0),
      }));

      const paidStatuses = ["paid", "success", "completed"];

      const totalSpent = customer.orders.reduce((total, order) => {
        const normalizedStatus = order.status.toLowerCase();
        if (!paidStatuses.includes(normalizedStatus)) {
          return total;
        }
        return total + Number(order.amount);
      }, 0);

      return NextResponse.json({
        status: "success",
        customer: {
          id: customer.id,
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          postalCode: customer.postalCode,
          createdAt: customer.createdAt.toISOString(),
          updatedAt: customer.updatedAt.toISOString(),
          orderCount: customer.orders.length,
          totalSpent,
          orders,
        },
      });
    } catch (error) {
      console.error("Müşteri detay hatası:", error);
      return NextResponse.json(
        { status: "error", message: "Müşteri detayı alınırken bir hata oluştu." },
        { status: 500 },
      );
    }
  },
};

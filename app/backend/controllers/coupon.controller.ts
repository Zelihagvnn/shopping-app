import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { validateCouponInput } from "../dtos/coupon.dto";
import {
  createCouponAdmin,
  deleteCouponAdmin,
  getActivePublicCoupons,
  getAllCouponsAdmin,
  updateCouponStatusAdmin,
  validateCouponCode,
} from "../services/coupon.service";

async function isAdmin(request: NextRequest) {
  try {
    return Boolean(
      await verifyAdminToken(request.cookies.get("adminToken")?.value),
    );
  } catch {
    return false;
  }
}

function unauthorized() {
  return NextResponse.json(
    { status: "error", message: "Yetkisiz erişim." },
    { status: 401 },
  );
}

export const couponController = {
  getPublicActive: async () => {
    try {
      const coupons = await getActivePublicCoupons();
      return NextResponse.json({ status: "success", coupons });
    } catch {
      return NextResponse.json(
        { status: "error", message: "Kuponlar alınamadı." },
        { status: 500 },
      );
    }
  },

  validateCode: async (request: NextRequest) => {
    try {
      const body = await request.json();
      const code = typeof body.code === "string" ? body.code.trim() : "";

      if (!code) {
        return NextResponse.json(
          { valid: false, message: "Kupon kodu boş olamaz." },
          { status: 400 },
        );
      }

      const result = await validateCouponCode(code);
      if (!result.valid) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result);
    } catch {
      return NextResponse.json(
        { valid: false, message: "Kupon doğrulanırken hata oluştu." },
        { status: 500 },
      );
    }
  },

  getAllAdmin: async (request: NextRequest) => {
    try {
      if (!(await isAdmin(request))) return unauthorized();
      const coupons = await getAllCouponsAdmin();
      return NextResponse.json({ status: "success", coupons });
    } catch {
      return NextResponse.json(
        { status: "error", message: "Kuponlar alınamadı." },
        { status: 500 },
      );
    }
  },

  createAdmin: async (request: NextRequest) => {
    try {
      if (!(await isAdmin(request))) return unauthorized();

      const body = await request.json();
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      const discount = Number(body.discount);
      const expirationDate = body.expirationDate ? new Date(body.expirationDate) : null;

      const inputError = validateCouponInput({ code, discount });
      if (inputError) {
        return NextResponse.json({ status: "error", message: inputError }, { status: 400 });
      }

      const coupon = await createCouponAdmin({ code, discount, expirationDate });

      return NextResponse.json({
        status: "success",
        message: "Kupon başarıyla oluşturuldu.",
        coupon,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kupon oluşturulamadı.";
      const status = message.includes("zaten mevcut") ? 409 : 400;
      return NextResponse.json({ status: "error", message }, { status });
    }
  },

  updateStatusAdmin: async (request: NextRequest) => {
    try {
      if (!(await isAdmin(request))) return unauthorized();

      const body = await request.json();
      const id = Number(body.id);

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          { status: "error", message: "Geçersiz kupon ID." },
          { status: 400 },
        );
      }

      const coupon = await updateCouponStatusAdmin(id, Boolean(body.isActive));

      return NextResponse.json({
        status: "success",
        message: "Kupon durumu güncellendi.",
        coupon,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kupon güncellenemedi.";
      return NextResponse.json({ status: "error", message }, { status: 500 });
    }
  },

  deleteAdmin: async (request: NextRequest) => {
    try {
      if (!(await isAdmin(request))) return unauthorized();

      const id = Number(request.nextUrl.searchParams.get("id"));

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          { status: "error", message: "Geçersiz kupon ID." },
          { status: 400 },
        );
      }

      await deleteCouponAdmin(id);

      return NextResponse.json({
        status: "success",
        message: "Kupon silindi.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kupon silinemedi.";
      return NextResponse.json({ status: "error", message }, { status: 400 });
    }
  },
};

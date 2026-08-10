import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { verifyCustomerToken } from "@/lib/customerAuth";
import { getAdminById } from "../services/admin.service";
import {
  confirmOrderPaid,
  getAllOrdersAdmin,
  getCustomerOrders,
  getOrderById,
  getOrderByMerchantRef,
  processPosCheckout,
  updateOrderStatusAdmin,
} from "../services/order.service";

interface PaythorProcessResponse {
  status?: string;
  data?: {
    transaction?: { status?: string };
    process?: {
      payment_token?: string;
      process_status?: string;
      amount?: string | number;
    };
    result?: { status?: string; code?: string | number };
  };
}

const money = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "";
};

export const orderController = {
  getCustomerOrders: async (request: NextRequest) => {
    try {
      const token = request.cookies.get("customerToken")?.value;
      const session = await verifyCustomerToken(token);

      if (!session) {
        return NextResponse.json(
          { status: "error", message: "Siparişlerinizi görüntülemek için giriş yapmalısınız." },
          { status: 401 },
        );
      }

      const orders = await getCustomerOrders(session.customerId);

      return NextResponse.json({
        status: "success",
        orders,
      });
    } catch (error) {
      console.error("Müşteri sipariş hatası:", error);
      return NextResponse.json(
        { status: "error", message: "Siparişler alınırken bir hata oluştu." },
        { status: 500 },
      );
    }
  },

  getCustomerOrderById: async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ) => {
    try {
      const token = request.cookies.get("customerToken")?.value;
      const session = await verifyCustomerToken(token);

      if (!session) {
        return NextResponse.json(
          { status: "error", message: "Bu işlem için giriş yapmalısınız." },
          { status: 401 },
        );
      }

      const { id } = await context.params;
      const orderId = Number(id);

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return NextResponse.json(
          { status: "error", message: "Geçerli bir sipariş kimliği gönderilmelidir." },
          { status: 400 },
        );
      }

      const order = await getOrderById(orderId, session.customerId);

      if (!order) {
        return NextResponse.json(
          { status: "error", message: "Sipariş bulunamadı." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        status: "success",
        order,
      });
    } catch (error) {
      console.error("Müşteri sipariş detay hatası:", error);
      return NextResponse.json(
        { status: "error", message: "Sipariş detayı alınırken bir hata oluştu." },
        { status: 500 },
      );
    }
  },

  verifyCustomerOrderStatus: async (request: NextRequest) => {
    try {
      const token = request.cookies.get("customerToken")?.value;
      const session = await verifyCustomerToken(token);

      if (!session) {
        return NextResponse.json(
          { status: "error", message: "Oturum açmanız gerekmektedir." },
          { status: 401 },
        );
      }

      const body = await request.json();
      const merchantReference =
        typeof body.merchantReference === "string"
          ? body.merchantReference.trim()
          : "";

      const processId =
        typeof body.processId === "string" ? body.processId.trim() : "";

      if (!merchantReference) {
        return NextResponse.json(
          { status: "error", message: "merchantReference alanı zorunludur." },
          { status: 400 },
        );
      }

      const existingOrder = await getOrderByMerchantRef(merchantReference);

      if (!existingOrder) {
        return NextResponse.json(
          { status: "error", message: "Sipariş bulunamadı." },
          { status: 404 },
        );
      }

      if (existingOrder.customerId !== session.customerId) {
        return NextResponse.json(
          { status: "error", message: "Bu sipariş için yetkiniz yok." },
          { status: 403 },
        );
      }

      if (existingOrder.status === "paid") {
        return NextResponse.json({
          status: "success",
          message: "Sipariş zaten ödenmiş olarak kayıtlı.",
          order: {
            id: existingOrder.id,
            merchantReference: existingOrder.merchantReference,
            status: existingOrder.status,
          },
        });
      }

      const publicKey = process.env.PAYTHOR_PUBLIC_KEY;
      const secretKey = process.env.PAYTHOR_SECRET_KEY;

      if (!publicKey || !secretKey) {
        throw new Error("PAYTHOR_PUBLIC_KEY veya PAYTHOR_SECRET_KEY eksik.");
      }

      const nonce = String(Math.floor(100000 + Math.random() * 900000));
      const timestamp = (Date.now() / 1000).toFixed(6);
      const signatureRaw = `${publicKey}${secretKey}${timestamp}${nonce}`;
      const hash = createHash("sha256").update(signatureRaw).digest("hex");
      const authorizationHeader = `ApiKeys ${publicKey}:${hash}`;

      const lookupBody = processId
        ? { process: { process_id: processId } }
        : { payment: { merchant_reference: merchantReference } };

      const paythorResponse = await fetch(
        "https://api.paythor.com/payment/process",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authorizationHeader,
            "X-Timestamp": timestamp,
            "X-Nonce": nonce,
          },
          body: JSON.stringify(lookupBody),
          cache: "no-store",
        },
      );

      const responseText = await paythorResponse.text();
      let paythorData: PaythorProcessResponse;

      try {
        paythorData = JSON.parse(responseText) as PaythorProcessResponse;
      } catch {
        return NextResponse.json(
          { status: "error", message: "Paythor ödeme bilgisi doğrulanamadı." },
          { status: 502 },
        );
      }

      const transactionStatus = paythorData.data?.transaction?.status?.toLowerCase();
      const processStatus = (
        paythorData.data?.process?.process_status ||
        (paythorData.data?.process as { status?: string; process_status?: string })?.status
      )?.toLowerCase();
      const resultStatus = paythorData.data?.result?.status?.toLowerCase();
      const resultCode = String(paythorData.data?.result?.code ?? "").trim();
      const topStatus = paythorData.status?.toLowerCase();

      const isPaythorSuccess =
        paythorResponse.ok &&
        (topStatus === "success" || topStatus === "completed" || topStatus === "approved") &&
        (
          transactionStatus === "completed" ||
          transactionStatus === "approved" ||
          processStatus === "completed" ||
          processStatus === "approved" ||
          resultStatus === "completed" ||
          resultCode === "1" ||
          resultCode === "00" ||
          resultCode === "0"
        );

      if (!isPaythorSuccess) {
        return NextResponse.json(
          {
            status: "error",
            message: "Paythor ödemeyi başarılı olarak doğrulamadı.",
          },
          { status: 400 },
        );
      }

      const paythorAmount = money(paythorData.data?.process?.amount);
      const orderAmount = money(existingOrder.amount.toString());

      if (!paythorAmount || !orderAmount || paythorAmount !== orderAmount) {
        return NextResponse.json(
          {
            status: "error",
            message: "Paythor ödeme tutarı sipariş tutarıyla eşleşmiyor.",
          },
          { status: 400 },
        );
      }

      const updatedOrder = await confirmOrderPaid(existingOrder.id, existingOrder.items);

      return NextResponse.json({
        status: "success",
        message: "Sipariş durumu ödenmiş olarak güncellendi.",
        order: {
          id: updatedOrder.id,
          merchantReference: updatedOrder.merchantReference,
          status: updatedOrder.status,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Sipariş durumu güncellenirken hata oluştu.";
      const status = message.includes("stok") ? 409 : 500;
      return NextResponse.json({ status: "error", message }, { status });
    }
  },

  getAllAdmin: async (request: NextRequest) => {
    try {
      const token = request.cookies.get("adminToken")?.value;
      const session = await verifyAdminToken(token);

      if (!session) {
        return NextResponse.json(
          { status: "error", message: "Siparişleri görüntülemek için admin girişi yapmalısınız." },
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

      const statusParam = request.nextUrl.searchParams.get("status") || undefined;
      const orders = await getAllOrdersAdmin(statusParam);

      return NextResponse.json({
        status: "success",
        orders,
      });
    } catch (error) {
      console.error("Admin sipariş listeleme hatası:", error);
      return NextResponse.json(
        { status: "error", message: "Siparişler alınırken bir hata oluştu." },
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
      const orderId = Number(id);

      if (!Number.isInteger(orderId) || orderId <= 0) {
        return NextResponse.json(
          { status: "error", message: "Geçerli bir sipariş kimliği gönderilmelidir." },
          { status: 400 },
        );
      }

      const order = await getOrderById(orderId);

      if (!order) {
        return NextResponse.json(
          { status: "error", message: "Sipariş bulunamadı." },
          { status: 404 },
        );
      }

      return NextResponse.json({ status: "success", order });
    } catch (error) {
      console.error("Admin sipariş detay hatası:", error);
      return NextResponse.json(
        { status: "error", message: "Sipariş detayı alınamadı." },
        { status: 500 },
      );
    }
  },

  updateStatusAdmin: async (
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
      const orderId = Number(id);
      const body = await request.json();
      const status = typeof body.status === "string" ? body.status.trim() : "";

      if (!status) {
        return NextResponse.json(
          { status: "error", message: "Sipariş durumu zorunludur." },
          { status: 400 },
        );
      }

      const updatedOrder = await updateOrderStatusAdmin(orderId, status);

      return NextResponse.json({
        status: "success",
        message: "Sipariş durumu başarıyla güncellendi.",
        order: updatedOrder,
      });
    } catch (error) {
      console.error("Admin sipariş durum güncelleme hatası:", error);
      return NextResponse.json(
        { status: "error", message: "Sipariş durumu güncellenemedi." },
        { status: 500 },
      );
    }
  },

  posCheckout: async (request: NextRequest) => {
    try {
      const session = await verifyAdminToken(
        request.cookies.get("adminToken")?.value,
      );

      if (!session) {
        return NextResponse.json(
          { status: "error", message: "Bu işlem için admin girişi yapmalısınız." },
          { status: 401 },
        );
      }

      const body = await request.json();
      const paymentMethod =
        body.paymentMethod === "cash" || body.paymentMethod === "card"
          ? body.paymentMethod
          : null;
      const rawItems = Array.isArray(body.items) ? body.items : [];

      if (!paymentMethod) {
        return NextResponse.json(
          { status: "error", message: "Geçerli bir ödeme yöntemi seçin." },
          { status: 400 },
        );
      }

      const order = await processPosCheckout(
        session.adminId,
        paymentMethod,
        rawItems,
      );

      return NextResponse.json({
        status: "success",
        message: "Satış başarıyla tamamlandı.",
        order: {
          id: order.id,
          merchantReference: order.merchantReference,
          amount: Number(order.amount),
          currency: order.currency,
          status: order.status,
          createdAt: order.createdAt,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "POS satışı tamamlanamadı.";
      return NextResponse.json({ status: "error", message }, { status: 400 });
    }
  },
};

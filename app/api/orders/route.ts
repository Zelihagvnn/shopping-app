import { NextRequest, NextResponse } from "next/server";
import { verifyCustomerToken } from "@/lib/customerAuth";
import { getCustomerOrders } from "@/services/orderService";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("customerToken")?.value;
    const session = await verifyCustomerToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Siparişleri görüntülemek için giriş yapmalısınız.",
        },
        { status: 401 },
      );
    }

    const orders = await getCustomerOrders(session.customerId);

    return NextResponse.json({ status: "success", orders });
  } catch (error) {
    console.error("Müşteri siparişleri alınırken hata oluştu:", error);
    return NextResponse.json(
      { status: "error", message: "Siparişler alınarken bir hata oluştu." },
      { status: 500 },
    );
  }
}

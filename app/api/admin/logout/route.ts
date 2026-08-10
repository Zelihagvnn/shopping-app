import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    status: "success",
    message: "Admin çıkışı yapıldı.",
  });

  response.cookies.set(
    "adminToken",
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }
  );

  return response;
}

import { NextResponse } from "next/server";
import { getActiveCategories } from "@/services/categoryService";

export async function GET() {
  try {
    const categories = await getActiveCategories();
    return NextResponse.json({ status: "success", categories });
  } catch (error) {
    console.error("Kategorileri alma hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kategoriler alınamadı." },
      { status: 500 },
    );
  }
}

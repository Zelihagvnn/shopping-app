import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import {
  createCategoryAdmin,
  deleteCategoryAdmin,
  getAllCategoriesAdmin,
  updateCategoryStatusAdmin,
} from "@/services/categoryService";

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

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) return unauthorized();

    const categories = await getAllCategoriesAdmin();
    return NextResponse.json({ status: "success", categories });
  } catch (error) {
    console.error("Admin kategori listeleme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kategoriler alınamadı." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) return unauthorized();

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name : "";

    const category = await createCategoryAdmin(name);

    return NextResponse.json({
      status: "success",
      message: "Kategori başarıyla oluşturuldu.",
      category,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Kategori eklenemedi.";
    const status = message.includes("zaten mevcut") ? 409 : 400;
    return NextResponse.json({ status: "error", message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) return unauthorized();

    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { status: "error", message: "Geçersiz kategori ID." },
        { status: 400 },
      );
    }

    const category = await updateCategoryStatusAdmin(id, Boolean(body.isActive));

    return NextResponse.json({
      status: "success",
      message: "Kategori durumu güncellendi.",
      category,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Kategori güncellenemedi.";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) return unauthorized();

    const id = Number(request.nextUrl.searchParams.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { status: "error", message: "Geçersiz kategori ID." },
        { status: 400 },
      );
    }

    await deleteCategoryAdmin(id);

    return NextResponse.json({
      status: "success",
      message: "Kategori silindi.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Kategori silinemedi.";
    const status = message.includes("ürünlerde kullanılıyor") ? 409 : 400;
    return NextResponse.json({ status: "error", message }, { status });
  }
}

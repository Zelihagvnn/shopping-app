import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

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

function createSlug(name: string) {
  return name
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) return unauthorized();

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

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
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { status: "error", message: "Kategori adı zorunludur." },
        { status: 400 },
      );
    }

    const slug = createSlug(name);

    if (!slug) {
      return NextResponse.json(
        { status: "error", message: "Geçerli bir kategori adı giriniz." },
        { status: 400 },
      );
    }

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }] },
    });

    if (existing) {
      return NextResponse.json(
        { status: "error", message: "Bu kategori zaten mevcut." },
        { status: 409 },
      );
    }

    const category = await prisma.category.create({
      data: { name, slug, isActive: true },
    });

    return NextResponse.json({
      status: "success",
      message: "Kategori başarıyla oluşturuldu.",
      category,
    });
  } catch (error) {
    console.error("Admin kategori ekleme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kategori eklenemedi." },
      { status: 500 },
    );
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

    const category = await prisma.category.update({
      where: { id },
      data: { isActive: Boolean(body.isActive) },
    });

    return NextResponse.json({
      status: "success",
      message: "Kategori durumu güncellendi.",
      category,
    });
  } catch (error) {
    console.error("Admin kategori güncelleme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kategori güncellenemedi." },
      { status: 500 },
    );
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

    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Bu kategori ürünlerde kullanılıyor. Önce ürünlerin kategorisini değiştirin.",
        },
        { status: 409 },
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({
      status: "success",
      message: "Kategori silindi.",
    });
  } catch (error) {
    console.error("Admin kategori silme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kategori silinemedi." },
      { status: 500 },
    );
  }
}

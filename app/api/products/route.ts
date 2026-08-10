import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";
import {
  createVariantInputs,
  formatProduct,
  normalizeIds,
  productCatalogInclude,
} from "@/lib/productCatalog";

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get("adminToken")?.value;

  if (!token) return null;

  try {
    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}

function unauthorized() {
  return NextResponse.json(
    {
      status: "error",
      message: "Bu işlem için admin girişi yapmalısınız.",
    },
    { status: 401 },
  );
}

async function validateCatalog(
  categoryId: number | null,
  sizeIds: number[],
  colorIds: number[],
) {
  const [category, sizeCount, colorCount] = await Promise.all([
    categoryId
      ? prisma.category.findFirst({
          where: { id: categoryId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.size.count({
      where: { id: { in: sizeIds }, isActive: true },
    }),
    prisma.color.count({
      where: { id: { in: colorIds }, isActive: true },
    }),
  ]);

  if (categoryId && !category) return "Seçilen kategori bulunamadı veya pasif.";
  if (sizeCount !== sizeIds.length) return "Seçilen bedenlerden biri geçersiz.";
  if (colorCount !== colorIds.length)
    return "Seçilen renklerden biri geçersiz.";

  return null;
}

function parseProductBody(body: Record<string, unknown>) {
  const barcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const image = typeof body.image === "string" ? body.image.trim() : "";
  const price = Number(body.price);
  const stock = Number(body.stock);
  const rawCategoryId =
    body.categoryId === "" || body.categoryId == null
      ? null
      : Number(body.categoryId);
  const categoryId =
    rawCategoryId === null ||
    (Number.isInteger(rawCategoryId) && rawCategoryId > 0)
      ? rawCategoryId
      : Number.NaN;

  return {
    barcode: barcode || null,
    title,
    description: description || null,
    image,
    price,
    stock,
    categoryId,
    sizeIds: normalizeIds(body.sizeIds),
    colorIds: normalizeIds(body.colorIds),
  };
}

function validateProductInput(input: ReturnType<typeof parseProductBody>) {
  if (input.barcode && !/^[A-Za-z0-9._-]{4,64}$/.test(input.barcode))
    return "Barkod 4-64 karakter olmalı; yalnızca harf, rakam, nokta, tire veya alt çizgi içermelidir.";
  if (!input.title) return "Ürün adı zorunludur.";
  if (!Number.isFinite(input.price) || input.price <= 0)
    return "Geçerli bir ürün fiyatı giriniz.";
  if (!input.image) return "Ürün resmi zorunludur.";
  if (!Number.isInteger(input.stock) || input.stock < 0)
    return "Stok miktarı geçerli bir tam sayı olmalıdır.";
  if (Number.isNaN(input.categoryId)) return "Geçerli bir kategori seçiniz.";

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const isAdminRequest = request.nextUrl.searchParams.get("admin") === "true";

    if (isAdminRequest && !(await checkAdmin(request))) {
      return unauthorized();
    }

    const products = await prisma.product.findMany({
      where: isAdminRequest ? undefined : { isActive: true },
      include: productCatalogInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products.map(formatProduct));
  } catch (error) {
    console.error("Ürünler getirilirken hata oluştu:", error);
    return NextResponse.json(
      { status: "error", message: "Ürünler getirilemedi." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdmin(request))) return unauthorized();

    const input = parseProductBody(await request.json());
    const inputError = validateProductInput(input);

    if (inputError) {
      return NextResponse.json(
        { status: "error", message: inputError },
        { status: 400 },
      );
    }

    const catalogError = await validateCatalog(
      input.categoryId,
      input.sizeIds,
      input.colorIds,
    );

    if (catalogError) {
      return NextResponse.json(
        { status: "error", message: catalogError },
        { status: 400 },
      );
    }

    const product = await prisma.product.create({
      data: {
        barcode: input.barcode,
        title: input.title,
        description: input.description,
        price: input.price,
        image: input.image,
        categoryId: input.categoryId,
        isActive: true,
        variants: {
          create: createVariantInputs(
            input.sizeIds,
            input.colorIds,
            input.stock,
          ),
        },
      },
      include: productCatalogInclude,
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Ürün başarıyla eklendi.",
        data: formatProduct(product),
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { status: "error", message: "Bu barkod başka bir üründe kullanılıyor." },
        { status: 409 },
      );
    }

    console.error("Ürün eklenirken hata oluştu:", error);
    return NextResponse.json(
      { status: "error", message: "Ürün eklenirken sunucu hatası oluştu." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await checkAdmin(request))) return unauthorized();

    const body = await request.json();
    const productId = Number(body.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Geçerli bir ürün kimliği gönderilmelidir.",
        },
        { status: 400 },
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { status: "error", message: "Güncellenecek ürün bulunamadı." },
        { status: 404 },
      );
    }

    if (body.statusOnly === true && typeof body.isActive === "boolean") {
      const product = await prisma.product.update({
        where: { id: productId },
        data: { isActive: body.isActive },
        include: productCatalogInclude,
      });

      return NextResponse.json({
        status: "success",
        message: "Ürün durumu güncellendi.",
        data: formatProduct(product),
      });
    }

    const input = parseProductBody(body);
    const inputError = validateProductInput(input);

    if (inputError) {
      return NextResponse.json(
        { status: "error", message: inputError },
        { status: 400 },
      );
    }

    const catalogError = await validateCatalog(
      input.categoryId,
      input.sizeIds,
      input.colorIds,
    );

    if (catalogError) {
      return NextResponse.json(
        { status: "error", message: catalogError },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        barcode: input.barcode,
        title: input.title,
        description: input.description,
        price: input.price,
        image: input.image,
        categoryId: input.categoryId,
        isActive:
          typeof body.isActive === "boolean"
            ? body.isActive
            : existingProduct.isActive,
        variants: {
          deleteMany: {},
          create: createVariantInputs(
            input.sizeIds,
            input.colorIds,
            input.stock,
          ),
        },
      },
      include: productCatalogInclude,
    });

    return NextResponse.json({
      status: "success",
      message: "Ürün başarıyla güncellendi.",
      data: formatProduct(product),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { status: "error", message: "Bu barkod başka bir üründe kullanılıyor." },
        { status: 409 },
      );
    }

    console.error("Ürün güncellenirken hata oluştu:", error);
    return NextResponse.json(
      { status: "error", message: "Ürün güncellenirken sunucu hatası oluştu." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await checkAdmin(request))) return unauthorized();

    const productId = Number(request.nextUrl.searchParams.get("id"));

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Geçerli bir ürün kimliği gönderilmelidir.",
        },
        { status: 400 },
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { status: "error", message: "Silinecek ürün bulunamadı." },
        { status: 404 },
      );
    }

    await prisma.product.delete({ where: { id: productId } });

    return NextResponse.json({
      status: "success",
      message: "Ürün başarıyla silindi.",
    });
  } catch (error) {
    console.error("Ürün silinirken hata oluştu:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          "Ürün siparişlerde kullanıldığı için silinemiyor olabilir. Bunun yerine pasif duruma getirebilirsiniz.",
      },
      { status: 500 },
    );
  }
}

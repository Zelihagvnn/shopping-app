import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { verifyAdminToken } from "@/lib/adminAuth";
import {
  createProduct,
  deleteProduct,
  findProductById,
  getAllProducts,
  parseProductBody,
  updateProduct,
  updateProductStatus,
  validateCatalog,
  validateProductInput,
} from "@/services/productService";

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

export async function GET(request: NextRequest) {
  try {
    const isAdminRequest = request.nextUrl.searchParams.get("admin") === "true";

    if (isAdminRequest && !(await checkAdmin(request))) {
      return unauthorized();
    }

    const products = await getAllProducts(isAdminRequest);

    return NextResponse.json(products);
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

    const product = await createProduct(input);

    return NextResponse.json(
      {
        status: "success",
        message: "Ürün başarıyla eklendi.",
        data: product,
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

    const existingProduct = await findProductById(productId);

    if (!existingProduct) {
      return NextResponse.json(
        { status: "error", message: "Güncellenecek ürün bulunamadı." },
        { status: 404 },
      );
    }

    if (body.statusOnly === true && typeof body.isActive === "boolean") {
      const product = await updateProductStatus(productId, body.isActive);

      return NextResponse.json({
        status: "success",
        message: "Ürün durumu güncellendi.",
        data: product,
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

    const product = await updateProduct(
      productId,
      input,
      existingProduct.isActive,
      body.isActive,
    );

    return NextResponse.json({
      status: "success",
      message: "Ürün başarıyla güncellendi.",
      data: product,
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

    const existingProduct = await findProductById(productId);

    if (!existingProduct) {
      return NextResponse.json(
        { status: "error", message: "Silinecek ürün bulunamadı." },
        { status: 404 },
      );
    }

    await deleteProduct(productId);

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

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductByBarcode,
  getProductById,
  getVariantByBarcode,
  updateProduct,
} from "../services/product.service";

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get("adminToken")?.value;
  return token ? await verifyAdminToken(token) : null;
}

function unauthorized() {
  return NextResponse.json(
    { status: "error", message: "Bu işlem için admin girişi yapmalısınız." },
    { status: 401 },
  );
}

export const productController = {
  getAll: async (request: NextRequest) => {
    try {
      const isAdminRequest = request.nextUrl.searchParams.get("admin") === "true";
      if (isAdminRequest && !(await checkAdmin(request))) return unauthorized();

      const products = await getAllProducts(isAdminRequest);
      return NextResponse.json(products);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Ürünler getirilemedi.";
      return NextResponse.json({ status: "error", message }, { status: 500 });
    }
  },

  getById: async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await context.params;
      const productId = Number(id);

      if (!Number.isInteger(productId) || productId <= 0) {
        return NextResponse.json(
          { status: "error", message: "Geçersiz ürün ID." },
          { status: 400 },
        );
      }

      const product = await getProductById(productId);

      if (!product) {
        return NextResponse.json(
          { status: "error", message: "Ürün bulunamadı." },
          { status: 404 },
        );
      }

      return NextResponse.json({ status: "success", product });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Ürün detayı alınamadı.";
      return NextResponse.json({ status: "error", message }, { status: 500 });
    }
  },

  getByBarcode: async (
    request: NextRequest,
    context: { params: Promise<{ barcode: string }> },
  ) => {
    try {
      if (!(await checkAdmin(request))) return unauthorized();

      const { barcode: rawBarcode } = await context.params;
      const barcode = decodeURIComponent(rawBarcode).trim();

      if (!barcode) {
        return NextResponse.json(
          { status: "error", message: "Geçerli bir barkod gönderilmelidir." },
          { status: 400 },
        );
      }

      const product = await getProductByBarcode(barcode);

      if (!product) {
        return NextResponse.json(
          { status: "error", message: "Bu barkoda ait ürün bulunamadı." },
          { status: 404 },
        );
      }

      return NextResponse.json({ status: "success", product });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Ürün bilgisi alınamadı.";
      return NextResponse.json({ status: "error", message }, { status: 500 });
    }
  },

  getPosVariantByBarcode: async (
    request: NextRequest,
    context: { params: Promise<{ barcode: string }> },
  ) => {
    try {
      if (!(await checkAdmin(request))) return unauthorized();

      const { barcode: rawBarcode } = await context.params;
      const barcode = decodeURIComponent(rawBarcode).trim();

      if (!barcode) {
        return NextResponse.json(
          { status: "error", message: "Geçerli bir barkod okutun." },
          { status: 400 },
        );
      }

      const variant = await getVariantByBarcode(barcode);

      if (!variant || !variant.isActive || !variant.product.isActive) {
        return NextResponse.json(
          { status: "error", message: "Barkoda ait aktif ürün bulunamadı." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        status: "success",
        variant: {
          id: variant.id,
          productId: variant.product.id,
          title: variant.product.title,
          image: variant.product.image,
          price: Number(variant.product.price),
          stock: variant.stock,
          barcode: variant.product.barcode || variant.sku || "",
          size: variant.size?.name ?? "",
          color: variant.color?.name ?? "",
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Ürün bilgisi alınamadı.";
      return NextResponse.json({ status: "error", message }, { status: 500 });
    }
  },

  create: async (request: NextRequest) => {
    try {
      if (!(await checkAdmin(request))) return unauthorized();

      const body = await request.json();
      const product = await createProduct(body);

      return NextResponse.json(
        { status: "success", message: "Ürün başarıyla eklendi.", data: product },
        { status: 201 },
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Ürün eklenirken hata oluştu.";
      return NextResponse.json({ status: "error", message }, { status: 400 });
    }
  },

  update: async (request: NextRequest) => {
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

      const product = await updateProduct(productId, body);

      return NextResponse.json({
        status: "success",
        message: "Ürün başarıyla güncellendi.",
        data: product,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Ürün güncellenirken hata oluştu.";
      return NextResponse.json({ status: "error", message }, { status: 400 });
    }
  },

  delete: async (request: NextRequest) => {
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

      await deleteProduct(productId);

      return NextResponse.json({
        status: "success",
        message: "Ürün başarıyla silindi.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Ürün silinirken hata oluştu.";
      return NextResponse.json({ status: "error", message }, { status: 400 });
    }
  },
};

import { productController } from "@/app/backend/controllers/product.controller";

export const GET = productController.getAll;
export const POST = productController.create;
export const PUT = productController.update;
export const DELETE = productController.delete;

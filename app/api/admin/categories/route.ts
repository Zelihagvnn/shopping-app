import { categoryController } from "@/app/backend/controllers/category.controller";

export const GET = categoryController.getAllAdmin;
export const POST = categoryController.createAdmin;
export const PUT = categoryController.updateStatusAdmin;
export const DELETE = categoryController.deleteAdmin;

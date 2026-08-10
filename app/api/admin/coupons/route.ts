import { couponController } from "@/app/backend/controllers/coupon.controller";

export const GET = couponController.getAllAdmin;
export const POST = couponController.createAdmin;
export const PUT = couponController.updateStatusAdmin;
export const DELETE = couponController.deleteAdmin;

import { orderController } from "@/app/backend/controllers/order.controller";

export const GET = orderController.getByIdAdmin;
export const PUT = orderController.updateStatusAdmin;
// app/backend/entities/order.entity.ts

export interface OrderItemEntity {
  id: number;
  orderId: number;
  productId?: number | null;
  variantId?: number | null;
  title: string;
  image?: string | null;
  price: number | string;
  quantity: number;
  selectedSize?: string | null;
  selectedColor?: string | null;
}

export interface OrderEntity {
  id: number;
  merchantReference: string;
  amount: number | string;
  currency: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  paymentToken?: string | null;
  paymentLink?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  customerId?: number | null;
  items: OrderItemEntity[];
}

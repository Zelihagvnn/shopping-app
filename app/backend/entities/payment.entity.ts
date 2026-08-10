// app/backend/entities/payment.entity.ts

export interface PaymentCartItemEntity {
  id: string;
  name: string;
  type: "product" | "discount" | "shipping" | "tax";
  price: string;
  quantity: number;
}

export interface PaythorPaymentDataEntity {
  merchant_reference?: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  payment_token?: string;
  payment_link?: string;
}

export interface PaythorResponseEntity {
  status?: string;
  message?: string;
  data?: PaythorPaymentDataEntity;
}

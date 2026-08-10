import { PaymentCartItemEntity } from "../entities/payment.entity";

export interface PaymentBodyDto {
  payment?: {
    return_url?: string;
    merchant_reference?: string;
    amount?: string | number;
    currency?: string;
  };
  payer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: {
      line_1?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
  order?: {
    cart?: PaymentCartItemEntity[];
  };
}

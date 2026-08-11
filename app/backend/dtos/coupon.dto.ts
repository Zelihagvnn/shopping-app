export function validateCouponInput(data: {
  code?: string;
  discount?: number;
}) {
  if (!data.code) return "Kupon kodu zorunludur.";
  if (!data.discount || data.discount <= 0 || data.discount > 100) {
    return "İndirim oranı 1 ile 100 arasında olmalıdır.";
  }
  return null;
}

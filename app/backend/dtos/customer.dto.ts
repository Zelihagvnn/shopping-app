export interface RegisterCustomerDto {
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
}

export interface UpdateCustomerDto {
  fullName: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
}

export function validateCustomerRegisterInput(data: {
  fullName?: string;
  email?: string;
  password?: string;
}) {
  if (!data.fullName || !data.email || !data.password) {
    return "Ad soyad, e-posta ve şifre zorunludur.";
  }
  if (!data.email.includes("@")) {
    return "Geçerli bir e-posta adresi giriniz.";
  }
  if (data.password.length < 6) {
    return "Şifre en az 6 karakter olmalıdır.";
  }
  return null;
}

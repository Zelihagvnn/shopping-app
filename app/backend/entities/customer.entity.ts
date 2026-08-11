export interface CustomerEntity {
  id: number;
  fullName: string;
  email: string;
  passwordHash?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

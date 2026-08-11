export interface AdminEntity {
  id: number;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

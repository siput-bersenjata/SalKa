import { Role, AccountStatus, PaymentMethod } from "@prisma/client";

export interface UserJWTPayload {
  userId: string;
  username: string;
  role: Role;
  storeId?: string;
  storeName?: string;
}

export interface TrialStatusResult {
  status: AccountStatus;
  isExpired: boolean;
  daysRemaining: number;
  expiresAt: Date;
  isLifetime: boolean;
  message: string;
}

export interface StoreProfileUpdate {
  name?: string;
  address?: string;
  phone?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  paperSize?: string;
}

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface CreateTransactionInput {
  storeId?: string;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  items: CartItemInput[];
  notes?: string;
  customerName?: string;
}

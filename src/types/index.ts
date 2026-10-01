import { Role, AccountStatus, PaymentMethod } from "@prisma/client";

export interface StaffPermissions {
  canViewReports?: boolean;
  canManageProducts?: boolean;
  canManageSettings?: boolean;
  canVoidTransaction?: boolean;
  canApplyDiscounts?: boolean;
}

export interface UserJWTPayload {
  userId: string;
  username: string;
  role: Role;
  storeId?: string;
  storeName?: string;
  ownerId?: string;
  permissions?: StaffPermissions | null;
  mirrorPercentage?: number;
  mirrorPrefix?: string;
  hideTransactionId?: boolean;
  dateRangeLimit?: string;
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
  hideInvoiceOnReceipt?: boolean;
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

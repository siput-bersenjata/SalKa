import { AccountStatus, Role, User } from "@prisma/client";
import { TrialStatusResult } from "@/types";

export function evaluateAccountTrial(user: Pick<User, "role" | "accountStatus" | "trialExpiresAt" | "subscriptionUntil">): TrialStatusResult {
  const now = new Date();

  // 1. Super Admin is always active
  if (user.role === Role.SUPER_ADMIN) {
    return {
      status: AccountStatus.ACTIVE,
      isExpired: false,
      daysRemaining: 9999,
      expiresAt: new Date(2099, 11, 31),
      isLifetime: true,
      message: "Akun Super Administrator (Aktif Selamanya)",
    };
  }

  // 2. Suspended
  if (user.accountStatus === AccountStatus.SUSPENDED) {
    return {
      status: AccountStatus.SUSPENDED,
      isExpired: true,
      daysRemaining: 0,
      expiresAt: now,
      isLifetime: false,
      message: "Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi dukungan.",
    };
  }

  // 3. Priority: Check subscriptionUntil if set by Super Admin
  if (user.subscriptionUntil) {
    const subDate = new Date(user.subscriptionUntil);
    const diffMs = subDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs > 0) {
      const isLifetime = subDate.getFullYear() >= 2090;
      return {
        status: AccountStatus.ACTIVE,
        isExpired: false,
        daysRemaining: diffDays,
        expiresAt: subDate,
        isLifetime,
        message: isLifetime
          ? "Akun Aktif Permanen (Lifetime)"
          : `Masa aktif langganan tersisa ${diffDays} hari lagi.`,
      };
    } else {
      return {
        status: AccountStatus.EXPIRED,
        isExpired: true,
        daysRemaining: 0,
        expiresAt: subDate,
        isLifetime: false,
        message: "Masa aktif langganan Anda telah berakhir. Silakan hubungi Admin untuk perpanjangan.",
      };
    }
  }

  // 4. Default: Check 30-Day Trial (trialExpiresAt)
  const trialDate = new Date(user.trialExpiresAt);
  const diffMs = trialDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs > 0) {
    return {
      status: AccountStatus.TRIAL,
      isExpired: false,
      daysRemaining: diffDays,
      expiresAt: trialDate,
      isLifetime: false,
      message: `Masa uji coba (Trial 1 Bulan) tersisa ${diffDays} hari lagi.`,
    };
  } else {
    return {
      status: AccountStatus.EXPIRED,
      isExpired: true,
      daysRemaining: 0,
      expiresAt: trialDate,
      isLifetime: false,
      message: "Masa trial 1 bulan Anda telah habis. Silakan hubungi Admin untuk perpanjangan masa aktif.",
    };
  }
}

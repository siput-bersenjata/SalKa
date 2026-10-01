import { NextResponse } from "next/server";
import { getUserFromRequest, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/staff - List all staff accounts for the logged-in owner
export async function GET(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only STORE_OWNER or SUPER_ADMIN can manage staff
    if (payload.role !== Role.STORE_OWNER && payload.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Hanya pemilik toko (Owner) yang dapat mengelola akun karyawan dan mirroring." },
        { status: 403 }
      );
    }

    const staffList = await prisma.user.findMany({
      where: {
        ownerId: payload.userId,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        accountStatus: true,
        permissions: true,
        mirrorPercentage: true,
        mirrorPrefix: true,
        hideTransactionId: true,
        dateRangeLimit: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const parsedList = staffList.map((s) => ({
      ...s,
      hideTransactionId: s.hideTransactionId ?? false,
      dateRangeLimit: s.dateRangeLimit ?? "ALL",
      permissions: s.permissions ? JSON.parse(s.permissions) : null,
    }));

    return NextResponse.json({ staff: parsedList });
  } catch (error: any) {
    console.error("List staff error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/staff - Create a new staff / cashier / mirroring account
export async function POST(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (payload.role !== Role.STORE_OWNER && payload.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Hanya pemilik toko (Owner) yang dapat membuat akun karyawan atau mirroring." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      username,
      password,
      fullName,
      phone,
      role = "CASHIER",
      permissions,
      mirrorPercentage = 100,
      mirrorPrefix = "TRX",
      hideTransactionId = false,
      dateRangeLimit = "ALL",
    } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    if (password.length < 5) {
      return NextResponse.json(
        { error: "Password minimal 5 karakter." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Username "${cleanUsername}" sudah digunakan. Silakan gunakan username lain.` },
        { status: 409 }
      );
    }

    // Get owner details and store
    const owner = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        stores: { take: 1 },
      },
    });

    if (!owner) {
      return NextResponse.json({ error: "Akun owner tidak ditemukan." }, { status: 404 });
    }

    const storeId = owner.stores[0]?.id;
    if (!storeId) {
      return NextResponse.json(
        { error: "Toko belum diinisialisasi untuk akun owner ini." },
        { status: 400 }
      );
    }

    // Validate role
    let assignedRole: Role = Role.CASHIER;
    if (role === "MANAGER") assignedRole = Role.MANAGER;
    else if (role === "MIRRORING") assignedRole = Role.MIRRORING;

    const passwordHash = await hashPassword(password);

    // Permissions defaults
    let permissionsJson: string | null = null;
    if (permissions && typeof permissions === "object") {
      permissionsJson = JSON.stringify(permissions);
    } else {
      // Default permissions based on role
      if (assignedRole === Role.CASHIER) {
        permissionsJson = JSON.stringify({
          canViewReports: false,
          canManageProducts: false,
          canManageSettings: false,
          canVoidTransaction: false,
          canApplyDiscounts: true,
        });
      } else if (assignedRole === Role.MANAGER) {
        permissionsJson = JSON.stringify({
          canViewReports: true,
          canManageProducts: true,
          canManageSettings: false,
          canVoidTransaction: true,
          canApplyDiscounts: true,
        });
      } else if (assignedRole === Role.MIRRORING) {
        permissionsJson = JSON.stringify({
          canViewReports: true,
          canManageProducts: false,
          canManageSettings: false,
          canVoidTransaction: false,
          canApplyDiscounts: false,
        });
      }
    }

    const validPercentage = Math.max(1, Math.min(100, parseInt(mirrorPercentage) || 100));

    const newStaff = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash,
        fullName: fullName?.trim() || null,
        phone: phone?.trim() || null,
        role: assignedRole,
        accountStatus: owner.accountStatus,
        trialExpiresAt: owner.trialExpiresAt,
        subscriptionUntil: owner.subscriptionUntil,
        ownerId: owner.id,
        assignedStoreId: storeId,
        permissions: permissionsJson,
        mirrorPercentage: assignedRole === Role.MIRRORING ? validPercentage : 100,
        mirrorPrefix: mirrorPrefix?.trim().toUpperCase() || "TRX",
        hideTransactionId: Boolean(hideTransactionId),
        dateRangeLimit: ["ALL", "THIS_MONTH", "1_MONTH", "2_MONTH"].includes(dateRangeLimit) ? dateRangeLimit : "ALL",
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        accountStatus: true,
        permissions: true,
        mirrorPercentage: true,
        mirrorPrefix: true,
        hideTransactionId: true,
        dateRangeLimit: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: `Akun ${assignedRole === Role.MIRRORING ? "data mirroring" : assignedRole.toLowerCase()} berhasil dibuat.`,
      staff: {
        ...newStaff,
        hideTransactionId: newStaff.hideTransactionId ?? false,
        dateRangeLimit: newStaff.dateRangeLimit ?? "ALL",
        permissions: newStaff.permissions ? JSON.parse(newStaff.permissions) : null,
      },
    });
  } catch (error: any) {
    console.error("Create staff error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

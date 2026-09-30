import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAccountTrial } from "@/lib/trial";

export async function GET(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json(
        { error: "Akses tidak diizinkan. Silakan login kembali." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        stores: true,
        assignedStore: true,
        owner: {
          include: {
            stores: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const store = user.stores[0] || user.assignedStore || user.owner?.stores[0] || null;
    const effectiveOwner = user.owner || user;
    const trial = evaluateAccountTrial(effectiveOwner);

    let parsedPermissions = null;
    if (user.permissions) {
      try {
        parsedPermissions = JSON.parse(user.permissions);
      } catch (_) {}
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        accountStatus: user.accountStatus,
        permissions: parsedPermissions,
        mirrorPercentage: user.mirrorPercentage ?? 100,
        mirrorPrefix: user.mirrorPrefix ?? "TRX",
        createdAt: user.createdAt,
      },
      store,
      trial,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal mengambil data user: " + (error?.message || "Server Error") },
      { status: 500 }
    );
  }
}

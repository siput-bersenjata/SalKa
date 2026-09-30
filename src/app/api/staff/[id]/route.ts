import { NextResponse } from "next/server";
import { getUserFromRequest, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// PUT /api/staff/[id] - Update staff permissions, mirror settings, or password
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (payload.role !== Role.STORE_OWNER && payload.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Hanya pemilik toko (Owner) yang dapat mengubah data karyawan atau mirroring." },
        { status: 403 }
      );
    }

    const { id } = params;

    // Verify staff belongs to this owner
    const existingStaff = await prisma.user.findFirst({
      where: {
        id,
        ownerId: payload.role === Role.SUPER_ADMIN ? undefined : payload.userId,
      },
    });

    if (!existingStaff) {
      return NextResponse.json(
        { error: "Akun karyawan atau mirroring tidak ditemukan atau bukan milik toko Anda." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      fullName,
      phone,
      password,
      role,
      permissions,
      mirrorPercentage,
      mirrorPrefix,
    } = body;

    const updateData: any = {};

    if (fullName !== undefined) updateData.fullName = fullName?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;

    if (password && password.trim().length >= 5) {
      updateData.passwordHash = await hashPassword(password.trim());
    }

    if (role && (role === "CASHIER" || role === "MANAGER" || role === "MIRRORING")) {
      updateData.role = role as Role;
    }

    if (permissions !== undefined) {
      updateData.permissions = typeof permissions === "object" ? JSON.stringify(permissions) : permissions;
    }

    if (mirrorPercentage !== undefined) {
      updateData.mirrorPercentage = Math.max(1, Math.min(100, parseInt(mirrorPercentage) || 100));
    }

    if (mirrorPrefix !== undefined) {
      updateData.mirrorPrefix = mirrorPrefix.trim().toUpperCase() || "TRX";
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
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
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "Data akun berhasil diperbarui.",
      staff: {
        ...updated,
        permissions: updated.permissions ? JSON.parse(updated.permissions) : null,
      },
    });
  } catch (error: any) {
    console.error("Update staff error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/staff/[id] - Remove a staff or mirroring account
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (payload.role !== Role.STORE_OWNER && payload.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Hanya pemilik toko (Owner) yang dapat menghapus akun karyawan." },
        { status: 403 }
      );
    }

    const { id } = params;

    const existingStaff = await prisma.user.findFirst({
      where: {
        id,
        ownerId: payload.role === Role.SUPER_ADMIN ? undefined : payload.userId,
      },
    });

    if (!existingStaff) {
      return NextResponse.json(
        { error: "Akun karyawan tidak ditemukan atau bukan milik toko Anda." },
        { status: 404 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "Akun karyawan berhasil dihapus." });
  } catch (error: any) {
    console.error("Delete staff error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

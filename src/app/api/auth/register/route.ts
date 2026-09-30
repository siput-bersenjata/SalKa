import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { evaluateAccountTrial } from "@/lib/trial";
import { AccountStatus, Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, fullName, phone, storeName, address } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: "Username minimal 3 karakter." },
        { status: 400 }
      );
    }

    if (password.length < 5) {
      return NextResponse.json(
        { error: "Password minimal 5 karakter." },
        { status: 400 }
      );
    }

    // Check existing
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username sudah digunakan, silakan pilih username lain." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();
    const trialExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 hari trial otomatis

    // Create user & store
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: cleanUsername,
          passwordHash,
          fullName: fullName?.trim() || cleanUsername,
          phone: phone?.trim() || null,
          role: Role.STORE_OWNER,
          accountStatus: AccountStatus.TRIAL,
          trialExpiresAt,
        },
      });

      const store = await tx.store.create({
        data: {
          userId: user.id,
          name: storeName?.trim() || "Toko Sumber Rejeki",
          address: address?.trim() || null,
          phone: phone?.trim() || null,
          receiptHeader: `${storeName?.trim() || "Toko Sumber Rejeki"} - Terima Kasih!`,
          receiptFooter: "Barang yang sudah dibeli tidak dapat ditukar/dikembalikan",
          paperSize: "58mm",
        },
      });

      // Default categories
      const defaultCategories = ["Minuman", "Makanan", "Snack", "Lainnya"];
      for (const catName of defaultCategories) {
        await tx.category.create({
          data: {
            storeId: store.id,
            name: catName,
          },
        });
      }

      return { user, store };
    });

    const trial = evaluateAccountTrial(result.user);
    const token = signToken({
      userId: result.user.id,
      username: result.user.username,
      role: result.user.role,
      storeId: result.store.id,
      storeName: result.store.name,
    });

    return NextResponse.json({
      message: "Registrasi berhasil! Anda mendapatkan masa trial gratis selama 30 hari.",
      token,
      user: {
        id: result.user.id,
        username: result.user.username,
        fullName: result.user.fullName,
        phone: result.user.phone,
        role: result.user.role,
      },
      store: result.store,
      trial,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Gagal memproses pendaftaran: " + (error?.message || "Server Error") },
      { status: 500 }
    );
  }
}

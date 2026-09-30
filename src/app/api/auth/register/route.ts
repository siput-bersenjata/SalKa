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
      const catMap: Record<string, string> = {};
      for (const catName of defaultCategories) {
        const cat = await tx.category.create({
          data: {
            storeId: store.id,
            name: catName,
          },
        });
        catMap[catName] = cat.id;
      }

      // Default starter products so newly created stores have ready-to-sell catalog
      const starterProducts = [
        {
          name: "Air Mineral 600ml",
          price: 3000,
          costPrice: 2000,
          stock: 50,
          minStock: 5,
          categoryId: catMap["Minuman"],
          barcode: "899123456001",
        },
        {
          name: "Teh Botol",
          price: 4000,
          costPrice: 2800,
          stock: 45,
          minStock: 5,
          categoryId: catMap["Minuman"],
          barcode: "899123456002",
        },
        {
          name: "Indomie Goreng",
          price: 3500,
          costPrice: 2500,
          stock: 35,
          minStock: 5,
          categoryId: catMap["Makanan"],
          barcode: "899123456003",
        },
        {
          name: "Roti Tawar",
          price: 8000,
          costPrice: 6000,
          stock: 20,
          minStock: 5,
          categoryId: catMap["Makanan"],
          barcode: "899123456004",
        },
        {
          name: "Kopi Sachet",
          price: 2000,
          costPrice: 1200,
          stock: 40,
          minStock: 5,
          categoryId: catMap["Minuman"],
          barcode: "899123456005",
        },
        {
          name: "Susu UHT",
          price: 5000,
          costPrice: 3800,
          stock: 30,
          minStock: 5,
          categoryId: catMap["Minuman"],
          barcode: "899123456006",
        },
      ];

      for (const prod of starterProducts) {
        await tx.product.create({
          data: {
            storeId: store.id,
            ...prod,
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

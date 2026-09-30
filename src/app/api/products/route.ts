import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAccountTrial } from "@/lib/trial";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const storeId =
      payload.role === Role.SUPER_ADMIN && searchParams.get("storeId")
        ? searchParams.get("storeId")!
        : payload.storeId;

    if (!storeId) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const whereClause: any = { storeId };

    if (categoryId && categoryId !== "all") {
      whereClause.categoryId = categoryId;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      orderBy: { name: "asc" },
    });

    const filtered = lowStockOnly
      ? products.filter((p) => p.stock <= p.minStock)
      : products;

    return NextResponse.json({ products: filtered });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify trial expiration
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const trial = evaluateAccountTrial(user);
    if (trial.isExpired) {
      return NextResponse.json(
        {
          error: "Masa aktif akun Anda telah berakhir. Anda tidak dapat menambah produk baru. Silakan hubungi Admin untuk perpanjangan masa aktif.",
          isExpired: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, price, costPrice, stock, minStock, categoryId, barcode, imageUrl, storeId: customStoreId } = body;

    const storeId =
      payload.role === Role.SUPER_ADMIN && customStoreId
        ? customStoreId
        : payload.storeId;

    if (!storeId || !name || price === undefined || price === null || price === "") {
      return NextResponse.json(
        { error: "Nama produk dan harga jual wajib diisi." },
        { status: 400 }
      );
    }

    const numPrice = typeof price === "number" ? price : parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return NextResponse.json(
        { error: "Harga jual harus berupa angka valid." },
        { status: 400 }
      );
    }

    // Cost price (Harga Modal): jika kosong atau tidak valid, otomatis jadi 0
    let numCostPrice = 0;
    if (costPrice !== undefined && costPrice !== null && costPrice !== "") {
      const parsed = typeof costPrice === "number" ? costPrice : parseFloat(costPrice);
      if (!isNaN(parsed) && parsed >= 0) {
        numCostPrice = parsed;
      }
    }

    // Stock: jika kosong atau tidak valid, otomatis jadi 0
    let numStock = 0;
    if (stock !== undefined && stock !== null && stock !== "") {
      const parsed = typeof stock === "number" ? Math.floor(stock) : parseInt(stock, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        numStock = parsed;
      }
    }

    // Min stock: default 5
    let numMinStock = 5;
    if (minStock !== undefined && minStock !== null && minStock !== "") {
      const parsed = typeof minStock === "number" ? Math.floor(minStock) : parseInt(minStock, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        numMinStock = parsed;
      }
    }

    const product = await prisma.product.create({
      data: {
        storeId,
        name: name.trim(),
        price: numPrice,
        costPrice: numCostPrice,
        stock: numStock,
        minStock: numMinStock,
        categoryId: categoryId || null,
        barcode: barcode?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      message: "Produk berhasil ditambahkan.",
      product,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

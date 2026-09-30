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

    if (!storeId || !name || price === undefined) {
      return NextResponse.json(
        { error: "Nama produk dan harga jual wajib diisi." },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        storeId,
        name: name.trim(),
        price: parseFloat(price),
        costPrice: costPrice !== undefined ? parseFloat(costPrice) : 0,
        stock: stock !== undefined ? parseInt(stock) : 0,
        minStock: minStock !== undefined ? parseInt(minStock) : 5,
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

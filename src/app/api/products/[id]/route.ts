import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    if (payload.role !== Role.SUPER_ADMIN && product.storeId !== payload.storeId) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    return NextResponse.json({ product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    if (payload.role !== Role.SUPER_ADMIN && existing.storeId !== payload.storeId) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json();
    const { name, price, costPrice, stock, minStock, categoryId, barcode, imageUrl } = body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name.trim();
    if (price !== undefined && price !== null && price !== "") {
      const parsedPrice = typeof price === "number" ? price : parseFloat(price);
      if (!isNaN(parsedPrice)) dataToUpdate.price = parsedPrice;
    }
    if (costPrice !== undefined && costPrice !== null) {
      if (costPrice === "") {
        dataToUpdate.costPrice = 0;
      } else {
        const parsedCost = typeof costPrice === "number" ? costPrice : parseFloat(costPrice);
        dataToUpdate.costPrice = !isNaN(parsedCost) ? parsedCost : 0;
      }
    }
    if (stock !== undefined && stock !== null) {
      if (stock === "") {
        dataToUpdate.stock = 0;
      } else {
        const parsedStock = typeof stock === "number" ? Math.floor(stock) : parseInt(stock, 10);
        dataToUpdate.stock = !isNaN(parsedStock) ? parsedStock : 0;
      }
    }
    if (minStock !== undefined && minStock !== null) {
      if (minStock === "") {
        dataToUpdate.minStock = 5;
      } else {
        const parsedMin = typeof minStock === "number" ? Math.floor(minStock) : parseInt(minStock, 10);
        dataToUpdate.minStock = !isNaN(parsedMin) ? parsedMin : 5;
      }
    }
    if (categoryId !== undefined) dataToUpdate.categoryId = categoryId || null;
    if (barcode !== undefined) dataToUpdate.barcode = barcode?.trim() || null;
    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl?.trim() || null;

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: { category: true },
    });

    return NextResponse.json({
      message: "Produk berhasil diperbarui.",
      product: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    if (payload.role !== Role.SUPER_ADMIN && existing.storeId !== payload.storeId) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Produk berhasil dihapus." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

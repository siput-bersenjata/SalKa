import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const storeId =
      payload.role === Role.SUPER_ADMIN && searchParams.get("storeId")
        ? searchParams.get("storeId")!
        : payload.storeId;

    if (!storeId) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const categories = await prisma.category.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, storeId: customStoreId } = body;

    const storeId =
      payload.role === Role.SUPER_ADMIN && customStoreId
        ? customStoreId
        : payload.storeId;

    if (!storeId || !name) {
      return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        storeId,
        name: name.trim(),
      },
    });

    return NextResponse.json({ category });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

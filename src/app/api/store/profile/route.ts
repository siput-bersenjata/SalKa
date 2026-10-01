import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetStoreId =
      payload.role === Role.SUPER_ADMIN && searchParams.get("storeId")
        ? searchParams.get("storeId")!
        : payload.storeId;

    if (!targetStoreId) {
      return NextResponse.json({ error: "Toko tidak ditemukan." }, { status: 404 });
    }

    const store = await prisma.store.findUnique({
      where: { id: targetStoreId },
    });

    if (!store) {
      return NextResponse.json({ error: "Toko tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ store });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, address, phone, receiptHeader, receiptFooter, paperSize, hideInvoiceOnReceipt } = body;

    const { searchParams } = new URL(request.url);
    const targetStoreId =
      payload.role === Role.SUPER_ADMIN && searchParams.get("storeId")
        ? searchParams.get("storeId")!
        : payload.storeId;

    if (!targetStoreId) {
      return NextResponse.json({ error: "Toko tidak ditemukan." }, { status: 404 });
    }

    const updated = await prisma.store.update({
      where: { id: targetStoreId },
      data: {
        ...(name && { name: name.trim() }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(receiptHeader !== undefined && { receiptHeader: receiptHeader?.trim() || null }),
        ...(receiptFooter !== undefined && { receiptFooter: receiptFooter?.trim() || null }),
        ...(paperSize && { paperSize: paperSize === "80mm" ? "80mm" : "58mm" }),
        ...(hideInvoiceOnReceipt !== undefined && { hideInvoiceOnReceipt: Boolean(hideInvoiceOnReceipt) }),
      },
    });

    return NextResponse.json({
      message: "Pengaturan toko dan printer berhasil disimpan.",
      store: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

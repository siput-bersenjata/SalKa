import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAccountTrial } from "@/lib/trial";
import { PaymentMethod, Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    const storeId =
      payload.role === Role.SUPER_ADMIN && searchParams.get("storeId")
        ? searchParams.get("storeId")!
        : payload.storeId;

    if (!storeId && payload.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const whereClause: any = {};
    if (storeId) {
      whereClause.storeId = storeId;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    const [totalCount, transactions] = await Promise.all([
      prisma.transaction.count({ where: whereClause }),
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          items: true,
          store: {
            select: { name: true, phone: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
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
          error: "Masa aktif akun Anda telah berakhir. Anda tidak dapat melakukan transaksi kasir baru. Silakan hubungi Admin untuk perpanjangan masa aktif.",
          isExpired: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { items, paymentMethod, paidAmount, customerName, notes, storeId: customStoreId } = body;

    const storeId =
      payload.role === Role.SUPER_ADMIN && customStoreId
        ? customStoreId
        : payload.storeId;

    if (!storeId) {
      return NextResponse.json({ error: "Toko tidak terdaftar." }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Keranjang belanja tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Fetch products
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let calculatedTotal = 0;
    const validatedItems: {
      productId: string;
      productName: string;
      price: number;
      quantity: number;
      subtotal: number;
    }[] = [];

    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        return NextResponse.json(
          { error: `Produk ID ${item.productId} tidak ditemukan di toko ini.` },
          { status: 400 }
        );
      }

      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          { error: `Jumlah barang untuk ${prod.name} tidak valid.` },
          { status: 400 }
        );
      }

      const subtotal = prod.price * qty;
      calculatedTotal += subtotal;

      validatedItems.push({
        productId: prod.id,
        productName: prod.name,
        price: prod.price,
        quantity: qty,
        subtotal,
      });
    }

    const payment =
      paymentMethod === "QRIS"
        ? PaymentMethod.QRIS
        : paymentMethod === "DEBIT_CREDIT"
        ? PaymentMethod.DEBIT_CREDIT
        : PaymentMethod.CASH;

    const paid = parseFloat(paidAmount);
    if (isNaN(paid) || paid < calculatedTotal) {
      return NextResponse.json(
        {
          error: `Nominal uang bayar (Rp ${paid || 0}) kurang dari total belanja (Rp ${calculatedTotal}).`,
        },
        { status: 400 }
      );
    }

    const change = Math.max(0, paid - calculatedTotal);

    // Generate Invoice Number: TRX + YYYYMMDD + 5 digit sequence
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSeq = Math.floor(10000 + Math.random() * 90000);
    const invoiceNumber = `TRX${dateStr}${randomSeq}`;

    // Execute atomic transaction: create record & decrement stock
    const transaction = await prisma.$transaction(async (tx) => {
      const createdTrx = await tx.transaction.create({
        data: {
          invoiceNumber,
          storeId,
          totalAmount: calculatedTotal,
          paidAmount: paid,
          changeAmount: change,
          paymentMethod: payment,
          cashierName: payload.username,
          customerName: customerName?.trim() || null,
          notes: notes?.trim() || null,
          items: {
            create: validatedItems,
          },
        },
        include: {
          items: true,
          store: true,
        },
      });

      // Decrement stock
      for (const item of validatedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return createdTrx;
    });

    return NextResponse.json({
      message: "Transaksi pembayaran berhasil!",
      transaction,
    });
  } catch (error: any) {
    console.error("Create transaction error:", error);
    return NextResponse.json(
      { error: "Gagal memproses transaksi: " + error.message },
      { status: 500 }
    );
  }
}

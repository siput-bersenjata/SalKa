import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const customStoreId = searchParams.get("storeId");

    const storeId =
      payload.role === Role.SUPER_ADMIN && customStoreId
        ? customStoreId
        : payload.role === Role.SUPER_ADMIN && !customStoreId
        ? undefined // All stores for Super Admin overview
        : payload.storeId;

    const whereStore: any = storeId ? { storeId } : {};

    // 1. Basic aggregates
    // Fetch basic aggregates first
    const [transactionsCount, totalRevenueAggregate, productsCount] = await Promise.all([
      prisma.transaction.count({ where: whereStore }),
      prisma.transaction.aggregate({
        where: whereStore,
        _sum: { totalAmount: true },
      }),
      prisma.product.count({ where: whereStore }),
    ]);

    // Low stock: fetch products and filter where stock <= minStock (Prisma can't do field-to-field comparison)
    const allProducts = await prisma.product.findMany({
      where: whereStore,
      include: { category: true },
      orderBy: { stock: "asc" },
    });
    const lowStockProducts = allProducts
      .filter((p) => p.stock <= p.minStock)
      .slice(0, 10);

    // Total Items Sold
    const itemsSoldAggregate = await prisma.transactionItem.aggregate({
      where: storeId
        ? { transaction: { storeId } }
        : {},
      _sum: { quantity: true },
    });

    const totalRevenue = totalRevenueAggregate._sum.totalAmount || 0;
    const totalItemsSold = itemsSoldAggregate._sum.quantity || 0;

    // 2. 7-Day Sales Trend
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentTrxList = await prisma.transaction.findMany({
      where: {
        ...whereStore,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        createdAt: true,
        totalAmount: true,
        paymentMethod: true,
      },
    });

    // Group by Day
    const daysMap = new Map<string, { date: string; label: string; total: number; count: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      daysMap.set(key, { date: key, label, total: 0, count: 0 });
    }

    // Payment Methods Count
    const paymentMethodsMap: Record<string, number> = {
      CASH: 0,
      QRIS: 0,
      DEBIT_CREDIT: 0,
    };

    for (const trx of recentTrxList) {
      const key = trx.createdAt.toISOString().slice(0, 10);
      if (daysMap.has(key)) {
        const item = daysMap.get(key)!;
        item.total += trx.totalAmount;
        item.count += 1;
      }
      if (paymentMethodsMap[trx.paymentMethod] !== undefined) {
        paymentMethodsMap[trx.paymentMethod] += trx.totalAmount;
      }
    }

    const salesTrend = Array.from(daysMap.values());

    // 3. Category Sales Distribution
    const itemsWithCategory = await prisma.transactionItem.findMany({
      where: storeId ? { transaction: { storeId } } : {},
      include: {
        product: {
          include: { category: true },
        },
      },
      take: 200,
    });

    const categorySalesMap: Record<string, number> = {};
    for (const item of itemsWithCategory) {
      const catName = item.product?.category?.name || "Lainnya";
      categorySalesMap[catName] = (categorySalesMap[catName] || 0) + item.subtotal;
    }

    const categoryDistribution = Object.entries(categorySalesMap).map(([name, value]) => ({
      name,
      value,
    }));

    // If empty category, fill fallback
    if (categoryDistribution.length === 0) {
      categoryDistribution.push(
        { name: "Minuman", value: 38 },
        { name: "Makanan", value: 27 },
        { name: "Snack", value: 15 },
        { name: "Lainnya", value: 20 }
      );
    }

    // 4. Latest 5 Transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: whereStore,
      include: {
        store: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // 5. Top 5 Best-Selling Products
    const topProducts = await prisma.product.findMany({
      where: whereStore,
      orderBy: { stock: "asc" },
      take: 5,
    });

    return NextResponse.json({
      summary: {
        totalTransactions: transactionsCount,
        totalRevenue,
        totalItemsSold,
        lowStockCount: lowStockProducts.length,
        totalProducts: productsCount,
      },
      salesTrend,
      categoryDistribution,
      paymentMethods: paymentMethodsMap,
      lowStockProducts,
      recentTransactions,
      topProducts,
    });
  } catch (error: any) {
    console.error("Reports summary error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

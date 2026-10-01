import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyMirroring } from "@/lib/mirroring";
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

    // Fetch user settings for access restrictions
    const userSettings = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        role: true,
        mirrorPercentage: true,
        mirrorPrefix: true,
        hideTransactionId: true,
        dateRangeLimit: true,
      },
    });

    const hideTransactionId = userSettings?.hideTransactionId ?? payload.hideTransactionId ?? false;
    const dateRangeLimit = userSettings?.dateRangeLimit ?? payload.dateRangeLimit ?? "ALL";

    // Enforce dateRangeLimit if restricted
    if (dateRangeLimit && dateRangeLimit !== "ALL") {
      const now = new Date();
      if (!whereStore.createdAt) whereStore.createdAt = {};

      if (dateRangeLimit === "THIS_MONTH") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        if (!whereStore.createdAt.gte || whereStore.createdAt.gte < startOfMonth) {
          whereStore.createdAt.gte = startOfMonth;
        }
      } else if (dateRangeLimit === "1_MONTH") {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        oneMonthAgo.setHours(0, 0, 0, 0);
        if (!whereStore.createdAt.gte || whereStore.createdAt.gte < oneMonthAgo) {
          whereStore.createdAt.gte = oneMonthAgo;
        }
      } else if (dateRangeLimit === "2_MONTH") {
        const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        twoMonthsAgo.setHours(0, 0, 0, 0);
        if (!whereStore.createdAt.gte || whereStore.createdAt.gte < twoMonthsAgo) {
          whereStore.createdAt.gte = twoMonthsAgo;
        }
      }
    }

    // Check if user is a MIRRORING account
    if (payload.role === Role.MIRRORING) {
      const percentage = userSettings?.mirrorPercentage ?? payload.mirrorPercentage ?? 100;
      const prefix = userSettings?.mirrorPrefix ?? payload.mirrorPrefix ?? "TRX";

      const allTrx = await prisma.transaction.findMany({
        where: whereStore,
        include: {
          items: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
          store: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const mirrored = applyMirroring(allTrx, percentage, prefix);

      const totalTransactions = mirrored.length;
      let totalRevenue = 0;
      let totalItemsSold = 0;

      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const daysMap = new Map<string, { date: string; label: string; total: number; count: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        daysMap.set(key, { date: key, label, total: 0, count: 0 });
      }

      const paymentMethodsMap: Record<string, number> = {
        CASH: 0,
        QRIS: 0,
        DEBIT_CREDIT: 0,
      };

      const categorySalesMap: Record<string, number> = {};
      const productSalesMap: Record<string, { name: string; price: number; quantity: number }> = {};

      for (const t of mirrored) {
        totalRevenue += t.totalAmount;

        const isRecent = t.createdAt >= sevenDaysAgo;
        if (isRecent) {
          const key = t.createdAt.toISOString().slice(0, 10);
          if (daysMap.has(key)) {
            const dayItem = daysMap.get(key)!;
            dayItem.total += t.totalAmount;
            dayItem.count += 1;
          }
        }

        if (paymentMethodsMap[t.paymentMethod] !== undefined) {
          paymentMethodsMap[t.paymentMethod] += t.totalAmount;
        }

        if (t.items) {
          for (const item of t.items) {
            totalItemsSold += item.quantity;

            const catName = item.product?.category?.name || "Lainnya";
            categorySalesMap[catName] = (categorySalesMap[catName] || 0) + item.subtotal;

            if (!productSalesMap[item.productName]) {
              productSalesMap[item.productName] = { name: item.productName, price: item.price, quantity: 0 };
            }
            productSalesMap[item.productName].quantity += item.quantity;
          }
        }
      }

      const salesTrend = Array.from(daysMap.values());
      const categoryDistribution = Object.entries(categorySalesMap).map(([name, value]) => ({
        name,
        value,
      }));

      if (categoryDistribution.length === 0) {
        categoryDistribution.push(
          { name: "Minuman", value: 38 },
          { name: "Makanan", value: 27 },
          { name: "Snack", value: 15 },
          { name: "Lainnya", value: 20 }
        );
      }

      const recentTransactions = [...mirrored].reverse().slice(0, 5).map((t) => ({
        ...t,
        invoiceNumber: hideTransactionId ? "" : t.invoiceNumber,
        hideInvoice: hideTransactionId,
      }));

      const topProducts = Object.values(productSalesMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map((p) => ({
          id: p.name,
          name: p.name,
          price: p.price,
          stock: 99,
          minStock: 5,
        }));

      return NextResponse.json({
        summary: {
          totalTransactions,
          totalRevenue,
          totalItemsSold,
          lowStockCount: 0,
          totalProducts: Object.keys(productSalesMap).length,
        },
        salesTrend,
        categoryDistribution,
        paymentMethods: paymentMethodsMap,
        lowStockProducts: [],
        recentTransactions,
        topProducts,
        isMirroring: true,
        mirrorPercentage: percentage,
        hideTransactionId,
        dateRangeLimit,
      });
    }

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

    const recentTransactionsFormatted = recentTransactions.map((t) => ({
      ...t,
      invoiceNumber: hideTransactionId ? "" : t.invoiceNumber,
      hideInvoice: hideTransactionId,
    }));

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
      recentTransactions: recentTransactionsFormatted,
      topProducts,
      hideTransactionId,
      dateRangeLimit,
    });
  } catch (error: any) {
    console.error("Reports summary error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

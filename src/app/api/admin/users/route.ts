import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAccountTrial } from "@/lib/trial";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload || payload.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Super Admin yang dapat mengakses data ini." },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      include: {
        stores: {
          include: {
            _count: {
              select: {
                products: true,
                transactions: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedUsers = users.map((u) => {
      const trialInfo = evaluateAccountTrial(u);
      const store = u.stores[0] || null;

      return {
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        accountStatus: u.accountStatus,
        createdAt: u.createdAt,
        trialExpiresAt: u.trialExpiresAt,
        subscriptionUntil: u.subscriptionUntil,
        trialInfo,
        store: store
          ? {
              id: store.id,
              name: store.name,
              paperSize: store.paperSize,
              productCount: store._count.products,
              transactionCount: store._count.transactions,
            }
          : null,
      };
    });

    return NextResponse.json({ users: formattedUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

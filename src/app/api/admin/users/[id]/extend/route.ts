import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAccountTrial } from "@/lib/trial";
import { AccountStatus, Role } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload || payload.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Super Admin yang dapat mengubah masa aktif akun." },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    const body = await request.json();
    const { extensionType, customDate, notes } = body;

    const now = new Date();
    // Base date is either existing valid subscription, trial date, or now
    const currentExpiry = targetUser.subscriptionUntil || targetUser.trialExpiresAt;
    const baseDate = currentExpiry && new Date(currentExpiry) > now ? new Date(currentExpiry) : now;

    let newExpiry: Date;

    switch (extensionType) {
      case "1_MONTH":
        newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case "3_MONTHS":
        newExpiry = new Date(baseDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        break;
      case "6_MONTHS":
        newExpiry = new Date(baseDate.getTime() + 180 * 24 * 60 * 60 * 1000);
        break;
      case "1_YEAR":
        newExpiry = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        break;
      case "LIFETIME":
        newExpiry = new Date("2099-12-31T23:59:59.000Z");
        break;
      case "CUSTOM":
        if (!customDate) {
          return NextResponse.json({ error: "Tanggal kustom wajib diisi." }, { status: 400 });
        }
        newExpiry = new Date(customDate);
        break;
      default:
        return NextResponse.json(
          { error: "Jenis perpanjangan tidak valid (1_MONTH, 3_MONTHS, 6_MONTHS, 1_YEAR, LIFETIME, CUSTOM)." },
          { status: 400 }
        );
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        subscriptionUntil: newExpiry,
        accountStatus: AccountStatus.ACTIVE,
        ...(notes && { notes: notes.trim() }),
      },
      include: {
        stores: true,
      },
    });

    const newTrialInfo = evaluateAccountTrial(updatedUser);

    return NextResponse.json({
      message: `Masa aktif akun ${updatedUser.username} berhasil diperpanjang hingga ${newExpiry.toLocaleDateString("id-ID")}.`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        accountStatus: updatedUser.accountStatus,
        subscriptionUntil: updatedUser.subscriptionUntil,
        trialInfo: newTrialInfo,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

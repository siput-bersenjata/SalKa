import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";
import { evaluateAccountTrial } from "@/lib/trial";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      include: {
        stores: {
          take: 1,
        },
        assignedStore: true,
        owner: {
          include: {
            stores: {
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Username atau password salah." },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Username atau password salah." },
        { status: 401 }
      );
    }

    // Resolve store: store owned, or assigned store, or owner's store
    const store = user.stores[0] || user.assignedStore || user.owner?.stores[0] || null;

    // Evaluate trial status based on the owner if this is a staff account
    const effectiveOwner = user.owner || user;
    const trial = evaluateAccountTrial(effectiveOwner);

    let parsedPermissions = null;
    if (user.permissions) {
      try {
        parsedPermissions = JSON.parse(user.permissions);
      } catch (_) {}
    }

    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      storeId: store?.id,
      storeName: store?.name,
      ownerId: user.ownerId || undefined,
      permissions: parsedPermissions,
      mirrorPercentage: user.mirrorPercentage ?? 100,
      mirrorPrefix: user.mirrorPrefix ?? "TRX",
    });

    const response = NextResponse.json({
      message: "Login berhasil.",
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        permissions: parsedPermissions,
        mirrorPercentage: user.mirrorPercentage ?? 100,
        mirrorPrefix: user.mirrorPrefix ?? "TRX",
      },
      store,
      trial,
    });

    // Set cookie for browser session
    response.cookies.set("salka_token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Gagal login: " + (error?.message || "Server Error") },
      { status: 500 }
    );
  }
}

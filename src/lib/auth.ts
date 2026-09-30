import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserJWTPayload } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET || "salka-kasirku-super-secret-key-2026-production";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: UserJWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): UserJWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserJWTPayload;
  } catch {
    return null;
  }
}

export function getAuthTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Fallback: check cookie
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => {
        const [k, ...v] = c.split("=");
        return [k, v.join("=")];
      })
    );
    if (cookies["salka_token"]) {
      return cookies["salka_token"];
    }
  }

  return null;
}

export function getUserFromRequest(request: Request): UserJWTPayload | null {
  const token = getAuthTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

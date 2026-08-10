import {
  jwtVerify,
  SignJWT,
} from "jose";

export interface AdminSession {
  adminId: number;
  fullName: string;
  email: string;
  role: string;
}

const getAdminSecret = () => {
  const secret =
    process.env.ADMIN_JWT_SECRET;

  if (!secret) {
    throw new Error(
      "ADMIN_JWT_SECRET bulunamadı."
    );
  }

  return new TextEncoder().encode(secret);
};

export async function createAdminToken(
  admin: AdminSession
) {
  return new SignJWT({
    adminId: admin.adminId,
    fullName: admin.fullName,
    email: admin.email,
    role: admin.role,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(getAdminSecret());
}

export async function verifyAdminToken(
  token?: string
): Promise<AdminSession | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      getAdminSecret()
    );

    const adminId =
      Number(payload.adminId);

    const fullName =
      typeof payload.fullName === "string"
        ? payload.fullName
        : "";

    const email =
      typeof payload.email === "string"
        ? payload.email
        : "";

    const role =
      typeof payload.role === "string"
        ? payload.role
        : "admin";

    if (
      !Number.isInteger(adminId) ||
      adminId <= 0 ||
      !email
    ) {
      return null;
    }

    return {
      adminId,
      fullName,
      email,
      role,
    };
  } catch {
    return null;
  }
}
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = "admin@novastore.com";
  const password = "Admin123!";

  const passwordHash = await bcrypt.hash(
    password,
    12
  );

  const admin = await prisma.admin.upsert({
    where: {
      email,
    },

    update: {
      fullName: "Nova Store Admin",
      passwordHash,
      role: "admin",
      isActive: true,
    },

    create: {
      fullName: "Nova Store Admin",
      email,
      passwordHash,
      role: "admin",
      isActive: true,
    },
  });

  console.log("Admin hesabı hazırlandı:");
  console.log({
    id: admin.id,
    fullName: admin.fullName,
    email: admin.email,
    role: admin.role,
  });

  console.log("Giriş bilgileri:");
  console.log(`E-posta: ${email}`);
  console.log(`Şifre: ${password}`);
}

main()
  .catch((error) => {
    console.error(
      "Admin oluşturulurken hata oluştu:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
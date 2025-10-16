// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPhone = process.env.SEED_ADMIN_PHONE || "+911234567890";
  const adminName = process.env.SEED_ADMIN_NAME || "Administrator";

  const existing = await prisma.user.findUnique({ where: { phone: adminPhone } });
  if (existing) {
    if (existing.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN", phoneVerifiedAt: existing.phoneVerifiedAt ?? new Date() },
      });
      console.log(`[seed] Upgraded user ${adminPhone} -> ADMIN`);
    } else {
      console.log(`[seed] Admin already exists: ${adminPhone}`);
    }
    return;
  }

  await prisma.user.create({
    data: {
      phone: adminPhone,
      name: adminName,
      role: "ADMIN",
      phoneVerifiedAt: new Date(),
    },
  });

  console.log(`[seed] Created admin ${adminPhone}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());

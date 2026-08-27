import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data for SLIMS...');

  // 1. Seed Users for All Key Roles & Capabilities (Phase 1 DoD)
  const usersToSeed = [
    {
      email: 'admin@slims.edu',
      username: 'admin',
      fullName: 'System Administrator',
      baseRole: 'ADMIN' as const,
      isTechnician: true,
      department: 'IT Infrastructure',
      password: 'admin123',
    },
  ];

  for (const u of usersToSeed) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        baseRole: u.baseRole,
        isTechnician: u.isTechnician,
        passwordHash,
      },
      create: {
        email: u.email,
        username: u.username,
        fullName: u.fullName,
        baseRole: u.baseRole,
        isTechnician: u.isTechnician,
        department: u.department,
        studentOrEmployeeId: u.studentOrEmployeeId || null,
        passwordHash,
      },
    });
  }

  // 2. Categories
  const categoryNames = [
    'Router',
    'Switch',
    'Access Point',
    'Firewall',
    'Server',
    'Modem',
    'Cable',
    'Peripheral',
  ];
  const categories = [];
  for (const name of categoryNames) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories.push(category);
  }

  // 3. Locations
  const locationNames = ['Server Room Main', 'Lab TKJ 1', 'Lab TKJ 2', 'Workshop RPL'];
  const locations = [];
  for (const name of locationNames) {
    const location = await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    locations.push(location);
  }

  console.log('✅ Seed completed successfully with default administrator account!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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
    {
      email: 'teacher@slims.edu',
      username: 'tech_teacher',
      fullName: 'Pak Budi Hartono (Tech Teacher)',
      baseRole: 'TEACHER' as const,
      isTechnician: true,
      department: 'Teknik Komputer & Jaringan',
      studentOrEmployeeId: 'NIP-19800512-001',
      password: 'teacher123',
    },
    {
      email: 'guru@slims.edu',
      username: 'guru_biasa',
      fullName: 'Ibu Ratna Dewi (Regular Teacher)',
      baseRole: 'TEACHER' as const,
      isTechnician: false,
      department: 'Rekayasa Perangkat Lunak',
      studentOrEmployeeId: 'NIP-19850220-002',
      password: 'guru123',
    },
    {
      email: 'student@slims.edu',
      username: 'student_afauzan',
      fullName: 'Ahmad Fauzan (Student)',
      baseRole: 'STUDENT' as const,
      isTechnician: false,
      department: 'Kelas XII TKJ 1',
      studentOrEmployeeId: 'NIS-2024-0018',
      password: 'student123',
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

  // 4. Sample Devices
  const devices = [
    {
      assetTag: 'RTR-001',
      qrCodeValue: 'QR-RTR-001',
      categoryId: categories[0].id,
      deviceType: 'Router',
      brand: 'MikroTik',
      model: 'RB4011iGS+RM',
      locationId: locations[1].id,
      status: 'AVAILABLE' as const,
      condition: 'EXCELLENT' as const,
      description: 'Main Lab Router with 10 Gigabit SFP+ port',
    },
    {
      assetTag: 'SW-001',
      qrCodeValue: 'QR-SW-001',
      categoryId: categories[1].id,
      deviceType: 'Switch',
      brand: 'Cisco',
      model: 'Catalyst 2960-24TT-L',
      locationId: locations[1].id,
      status: 'AVAILABLE' as const,
      condition: 'GOOD' as const,
      description: '24-port Managed Ethernet Switch',
    },
  ];

  for (const deviceData of devices) {
    await prisma.device.upsert({
      where: { assetTag: deviceData.assetTag },
      update: {},
      create: deviceData,
    });
  }

  console.log('✅ Seed completed successfully with all test accounts!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.positionPermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.position.deleteMany();

  // ============================================
  // Seed Positions
  // ============================================
  console.log('📋 Seeding positions...');
  const adminPosition = await prisma.position.create({
    data: {
      name: 'Administrator',
      description: 'Full system access with all permissions',
    },
  });

  const memberPosition = await prisma.position.create({
    data: {
      name: 'Member',
      description: 'Standard user with limited permissions',
    },
  });

  console.log('✅ Positions seeded');

  // ============================================
  // Seed Permissions
  // ============================================
  console.log('🔐 Seeding permissions...');

  const permissionsData = [
    // User Management
    { name: 'VIEW_USER', resource: 'USER', action: 'VIEW', description: 'View user information' },
    { name: 'ADD_USER', resource: 'USER', action: 'ADD', description: 'Create new user' },
    { name: 'UPDATE_USER', resource: 'USER', action: 'UPDATE', description: 'Update user information' },
    { name: 'DELETE_USER', resource: 'USER', action: 'DELETE', description: 'Delete user' },
    { name: 'MANAGE_USER_PERMISSION', resource: 'USER', action: 'MANAGE_PERMISSION', description: 'Assign or revoke user permissions' },
    { name: 'CHANGE_USER_POSITION', resource: 'USER', action: 'CHANGE_POSITION', description: 'Change user position/role' },

    // Position Management
    { name: 'VIEW_POSITION', resource: 'POSITION', action: 'VIEW', description: 'View position information' },
    { name: 'ADD_POSITION', resource: 'POSITION', action: 'ADD', description: 'Create new position' },
    { name: 'UPDATE_POSITION', resource: 'POSITION', action: 'UPDATE', description: 'Update position information' },
    { name: 'DELETE_POSITION', resource: 'POSITION', action: 'DELETE', description: 'Delete position' },

    // Permission Management
    { name: 'VIEW_PERMISSION', resource: 'PERMISSION', action: 'VIEW', description: 'View permission information' },
    { name: 'ADD_PERMISSION', resource: 'PERMISSION', action: 'ADD', description: 'Create new permission' },
    { name: 'UPDATE_PERMISSION', resource: 'PERMISSION', action: 'UPDATE', description: 'Update permission information' },
    { name: 'DELETE_PERMISSION', resource: 'PERMISSION', action: 'DELETE', description: 'Delete permission' },
  ];

  const permissions = await Promise.all(
    permissionsData.map((permission) =>
      prisma.permission.create({ data: permission })
    )
  );

  console.log(`✅ ${permissions.length} permissions seeded`);

  // ============================================
  // Assign Permissions to Positions
  // ============================================
  console.log('🔗 Assigning permissions to positions...');

  // Admin gets all permissions
  const adminPermissions = permissions.map((permission) => ({
    position_id: adminPosition.id,
    permission_id: permission.id,
  }));

  await prisma.positionPermission.createMany({
    data: adminPermissions,
  });

  // Member gets only VIEW_USER permission
  const viewUserPermission = permissions.find((p) => p.name === 'VIEW_USER');
  if (viewUserPermission) {
    await prisma.positionPermission.create({
      data: {
        position_id: memberPosition.id,
        permission_id: viewUserPermission.id,
      },
    });
  }

  console.log('✅ Permissions assigned to positions');

  // ============================================
  // Seed Users
  // ============================================
  console.log('👥 Seeding users...');

  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@urbansolv.co.id',
      password: hashedPassword,
      first_name: 'Admin',
      last_name: 'Urbansolv',
      position_id: adminPosition.id,
      is_active: true,
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      email: 'member@urbansolv.co.id',
      password: hashedPassword,
      first_name: 'Member',
      last_name: 'User',
      position_id: memberPosition.id,
      is_active: true,
    },
  });

  console.log('✅ Users seeded');

  // ============================================
  // Summary
  // ============================================
  console.log('\n✨ Database seeding completed!\n');
  console.log('📊 Summary:');
  console.log(`   - Positions: ${await prisma.position.count()}`);
  console.log(`   - Permissions: ${await prisma.permission.count()}`);
  console.log(`   - Users: ${await prisma.user.count()}`);
  console.log(`   - Position-Permission Links: ${await prisma.positionPermission.count()}\n`);

  console.log('🔑 Default Users:');
  console.log(`   Admin: ${adminUser.email} / ${defaultPassword}`);
  console.log(`   Member: ${memberUser.email} / ${defaultPassword}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

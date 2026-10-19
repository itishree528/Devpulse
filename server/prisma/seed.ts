import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data for clean seed
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // Create primary demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'itishreesahoo936@gmail.com',
      name: 'Itishree Sahoo',
      passwordHash: hashedPassword,
      avatarColor: '#3B82F6',
    },
  });

  console.log(`👤 Created User: ${user.name} (${user.email})`);

  // Create primary workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'DevPulse Engineering',
      description: 'Main collaborative workspace for technical specifications and sprint planning.',
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: Role.OWNER,
        },
      },
    },
  });

  console.log(`🏢 Created Workspace: ${workspace.name}`);

  // Create initial document
  const doc = await prisma.document.create({
    data: {
      title: 'DevPulse Architecture Guide',
      content: `# DevPulse - Real-Time Collaborative Workspace\n\nWelcome to your normalized PostgreSQL workspace backed by Prisma ORM!\n\n## Key Architectural Features:\n- ⚡ **Low-Latency WebSockets**: Bi-directional real-time document synchronization.\n- 🔒 **RBAC Permissions**: Workspace Owner, Editor, and Viewer access control.\n- 🐘 **PostgreSQL & Prisma**: Fully normalized relational schema.\n- 🐳 **Docker Multi-Stage Builds**: Production-ready microservices packaging.\n- 📊 **k6 Load Benchmarking**: Sustaining 1,200 req/sec at <45ms p95 latency.\n`,
      workspaceId: workspace.id,
      authorId: user.id,
    },
  });

  console.log(`📄 Created Document: ${doc.title} (ID: ${doc.id})`);
  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

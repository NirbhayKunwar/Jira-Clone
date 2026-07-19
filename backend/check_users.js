import prisma from './config/prisma.js';

async function main() {
  console.log('Updating user 18 by email...');
  const res = await prisma.user.update({
    where: { email: 'nirbhaykunwar18@gmail.com' },
    data: { rbacRole: 'ADMIN' }
  });
  console.log('Updated user:', res);
}

main().catch(err => {
  console.error(err);
}).finally(async () => {
  await prisma.$disconnect();
});

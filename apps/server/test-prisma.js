const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const user = await prisma.user.findFirst();
    let wallet = await prisma.wallet.findUnique({ where: { userId: user.id }});
    if (!wallet) wallet = await prisma.wallet.create({ data: { userId: user.id, balance: 0, currency: 'GHS', status: 'ACTIVE' }});
    
    await prisma.card.create({
      data: {
        walletId: wallet.id,
        type: 'VISA',
        cardholderName: 'John Doe',
        last4: '4242',
        expiryMonth: '12',
        expiryYear: '2025',
        isDefault: false
      }
    });
    console.log('Success');
  } catch(e) {
    console.error('Prisma Error Code:', e.code);
    console.error('Prisma Error Message:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

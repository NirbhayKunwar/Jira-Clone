import prisma from './prisma.js';

export const initializeDatabase = async () => {
  try {
    console.log('[DATABASE] Verifying MongoDB Atlas connection...');
    await prisma.$connect();
    console.log('[DATABASE] Connected to MongoDB Atlas successfully.');
  } catch (error) {
    console.error('[DATABASE] Failed to connect to MongoDB Atlas:', error);
    throw error;
  }
};

import prisma from '../config/prisma.js';

export const findByEmail = async (email) => {
  if (!email) return null;
  return await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
};

export const findById = async (id) => {
  if (!id) return null;
  return await prisma.user.findUnique({
    where: { id }
  });
};

export const findByGoogleId = async (googleId) => {
  if (!googleId) return null;
  return await prisma.user.findUnique({
    where: { googleId }
  });
};

export const linkGoogleAccount = async (userId, googleId, avatarUrl = null) => {
  const updateData = {
    googleId,
    authProvider: 'GOOGLE'
  };
  if (avatarUrl) {
    updateData.avatarUrl = avatarUrl;
  }
  return await prisma.user.update({
    where: { id: userId },
    data: updateData
  });
};

export const createGoogleUser = async ({ email, name, googleId, avatarUrl = null }) => {
  return await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      googleId,
      avatarUrl: avatarUrl || null,
      authProvider: 'GOOGLE',
      status: 'ACTIVE'
    }
  });
};

export const updateUser = async (id, data) => {
  return await prisma.user.update({
    where: { id },
    data
  });
};

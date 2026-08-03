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

export const updateUser = async (id, data) => {
  return await prisma.user.update({
    where: { id },
    data
  });
};

import prisma from '../config/prisma.js';
import logger from '../config/logger.js';

export const createAuditLog = async ({
  actorId = null,
  targetUserId = null,
  action,
  resourceType = 'User',
  resourceId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    const log = await prisma.auditLog.create({
      data: {
        actorId,
        targetUserId,
        action,
        resourceType,
        resourceId,
        oldValue,
        newValue,
        ipAddress,
        userAgent
      }
    });
    logger.info(`[AUDIT LOG] ${action} on ${resourceType} ${resourceId || ''} by actor ${actorId || 'System'}`);
    return log;
  } catch (error) {
    logger.error('[AUDIT LOG ERROR] Failed to record audit log:', error);
    return null;
  }
};

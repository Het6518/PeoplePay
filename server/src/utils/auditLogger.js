const prisma = require('../config/prisma');

/**
 * Logs an action to the AuditLog database table
 * @param {Object} params
 * @param {string} params.actionType - e.g. "PAYRUN_CREATE", "STRUCTURE_UPDATE", "RULE_UPDATE", "EMPLOYEE_STATUS", "CONTRACT_END", "USER_ROLE_CHANGE"
 * @param {string} params.entityType - e.g. "PAYRUN", "SALARY_STRUCTURE", "SALARY_RULE", "EMPLOYEE", "CONTRACT", "USER"
 * @param {string} [params.entityId] - ID of the affected entity
 * @param {string} params.description - Human readable summary of the action
 * @param {string} [params.performedBy] - User email or identifier
 */
const logAuditAction = async ({
  actionType,
  entityType,
  entityId = null,
  description,
  performedBy = 'System',
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        actionType,
        entityType,
        entityId,
        description,
        performedBy,
      },
    });
  } catch (err) {
    console.error('Failed to write AuditLog entry:', err.message);
  }
};

module.exports = {
  logAuditAction,
};

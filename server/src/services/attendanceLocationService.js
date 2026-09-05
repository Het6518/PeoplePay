/**
 * Attendance Location Service — Location CRUD, Employee Assignment, and Audit Logging
 */

const prisma = require('../config/prisma');

/**
 * Gets all attendance locations with assigned employee counts.
 */
async function getAllLocations(query = {}) {
  const { isActive, search } = query;
  const where = {};

  if (isActive !== undefined && isActive !== '') {
    where.isActive = isActive === 'true' || isActive === true;
  }

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const locations = await prisma.attendanceLocation.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { employees: true, attendances: true } },
      createdBy: { select: { id: true, email: true, role: true } },
    },
  });

  return locations.map((loc) => ({
    ...loc,
    employeeCount: loc._count.employees,
    attendanceCount: loc._count.attendances,
  }));
}

/**
 * Gets a single attendance location by ID.
 */
async function getLocationById(id) {
  const location = await prisma.attendanceLocation.findUnique({
    where: { id },
    include: {
      _count: { select: { employees: true, attendances: true } },
      createdBy: { select: { id: true, email: true, role: true } },
      employees: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: { select: { id: true, name: true } },
          jobPosition: true,
        },
      },
    },
  });

  if (!location) return null;

  return {
    ...location,
    employeeCount: location._count.employees,
    attendanceCount: location._count.attendances,
  };
}

/**
 * Creates a new attendance location and records audit log.
 */
async function createLocation(data, userId = null, userName = 'System Admin') {
  const newLocation = await prisma.attendanceLocation.create({
    data: {
      name: data.name,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radiusMeters: Number(data.radiusMeters || 500),
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdById: userId,
    },
  });

  // Audit log
  await prisma.attendanceLocationAudit.create({
    data: {
      locationId: newLocation.id,
      locationName: newLocation.name,
      changedById: userId || 'SYSTEM',
      changedByName: userName,
      changeType: 'CREATE',
      newValues: {
        name: newLocation.name,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        radiusMeters: newLocation.radiusMeters,
        isActive: newLocation.isActive,
      },
    },
  });

  return newLocation;
}

/**
 * Updates an attendance location and records audit log.
 */
async function updateLocation(id, data, userId = null, userName = 'System Admin') {
  const existing = await prisma.attendanceLocation.findUnique({ where: { id } });
  if (!existing) throw new Error('LOCATION_NOT_FOUND');

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.latitude !== undefined) updateData.latitude = Number(data.latitude);
  if (data.longitude !== undefined) updateData.longitude = Number(data.longitude);
  if (data.radiusMeters !== undefined) updateData.radiusMeters = Number(data.radiusMeters);
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

  const updatedLocation = await prisma.attendanceLocation.update({
    where: { id },
    data: updateData,
  });

  // Audit log
  await prisma.attendanceLocationAudit.create({
    data: {
      locationId: updatedLocation.id,
      locationName: updatedLocation.name,
      changedById: userId || 'SYSTEM',
      changedByName: userName,
      changeType: 'UPDATE',
      oldValues: {
        name: existing.name,
        latitude: existing.latitude,
        longitude: existing.longitude,
        radiusMeters: existing.radiusMeters,
        isActive: existing.isActive,
      },
      newValues: {
        name: updatedLocation.name,
        latitude: updatedLocation.latitude,
        longitude: updatedLocation.longitude,
        radiusMeters: updatedLocation.radiusMeters,
        isActive: updatedLocation.isActive,
      },
    },
  });

  return updatedLocation;
}

/**
 * Toggles location active status.
 */
async function toggleLocationStatus(id, isActive, userId = null, userName = 'System Admin') {
  return updateLocation(id, { isActive }, userId, userName);
}

/**
 * Deletes an attendance location if safe.
 */
async function deleteLocation(id, userId = null, userName = 'System Admin') {
  const existing = await prisma.attendanceLocation.findUnique({
    where: { id },
    include: { _count: { select: { attendances: true, employees: true } } },
  });

  if (!existing) throw new Error('LOCATION_NOT_FOUND');

  // Unassign employees if any
  if (existing._count.employees > 0) {
    await prisma.employee.updateMany({
      where: { attendanceLocationId: id },
      data: { attendanceLocationId: null },
    });
  }

  // Record audit log before deletion
  await prisma.attendanceLocationAudit.create({
    data: {
      locationId: existing.id,
      locationName: existing.name,
      changedById: userId || 'SYSTEM',
      changedByName: userName,
      changeType: 'DELETE',
      oldValues: {
        name: existing.name,
        latitude: existing.latitude,
        longitude: existing.longitude,
        radiusMeters: existing.radiusMeters,
        isActive: existing.isActive,
      },
    },
  });

  await prisma.attendanceLocation.delete({ where: { id } });
  return { success: true };
}

/**
 * Assigns an employee to an attendance location.
 */
async function assignLocationToEmployee(employeeId, locationId, userId = null, userName = 'System Admin') {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND');

  if (locationId) {
    const location = await prisma.attendanceLocation.findUnique({ where: { id: locationId } });
    if (!location) throw new Error('LOCATION_NOT_FOUND');
  }

  const updatedEmployee = await prisma.employee.update({
    where: { id: employeeId },
    data: { attendanceLocationId: locationId || null },
    include: {
      attendanceLocation: true,
    },
  });

  // Audit log
  await prisma.attendanceLocationAudit.create({
    data: {
      locationId: locationId || 'UNASSIGNED',
      locationName: updatedEmployee.attendanceLocation?.name || 'Unassigned',
      changedById: userId || 'SYSTEM',
      changedByName: userName,
      changeType: 'ASSIGN',
      newValues: {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        locationId,
      },
    },
  });

  return updatedEmployee;
}

/**
 * Resolves the active attendance location for an employee.
 * Checks employee's assigned location first; if unassigned, picks default active location.
 */
async function getEmployeeAttendanceLocation(employeeId) {
  if (employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { attendanceLocation: true },
    });

    if (employee?.attendanceLocation && employee.attendanceLocation.isActive) {
      return employee.attendanceLocation;
    }
  }

  // Fallback: Return first active location
  const defaultLocation = await prisma.attendanceLocation.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  return defaultLocation;
}

/**
 * Retrieves audit log entries for location changes.
 */
async function getLocationAuditLogs(locationId = null) {
  const where = {};
  if (locationId) where.locationId = locationId;

  return prisma.attendanceLocationAudit.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

module.exports = {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  toggleLocationStatus,
  deleteLocation,
  assignLocationToEmployee,
  getEmployeeAttendanceLocation,
  getLocationAuditLogs,
};

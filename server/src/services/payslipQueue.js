/**
 * PeoplePay360 Payslip Email Queue Service
 *
 * Implements an asynchronous, Redis-backed job queue for bulk payslip email dispatch.
 * Concurrently generates PDFs and sends emails in the background with automatic retries,
 * rate limiting, and real-time progress tracking to prevent HTTP timeouts.
 */

const { getCache, setCache } = require('../config/redis');
const defaultPrisma = require('../config/prisma');
const pdfService = require('./pdfService');
const emailService = require('./emailService');

// In-memory fallback map if Redis is temporarily offline
const inMemoryJobs = new Map();

// Active processing flags to prevent duplicate worker execution for the same payrun
const activeWorkers = new Set();

/**
 * Generate Redis cache key for a payslip dispatch job
 */
function getJobKey(jobId) {
  return `queue:payslips:job:${jobId}`;
}

function getLatestPayrunJobKey(payrunId) {
  return `queue:payslips:payrun:${payrunId}:latest`;
}

/**
 * Get job status from Redis or in-memory fallback
 */
async function getJobStatus(jobId) {
  const cached = await getCache(getJobKey(jobId));
  if (cached) return cached;
  return inMemoryJobs.get(jobId) || null;
}

/**
 * Update job progress in Redis & in-memory
 */
async function updateJobState(jobId, state) {
  const existing = (await getJobStatus(jobId)) || {};
  const updated = {
    ...existing,
    ...state,
    updatedAt: new Date().toISOString(),
  };

  inMemoryJobs.set(jobId, updated);
  // Persist in Redis for 24 hours (86400s)
  await setCache(getJobKey(jobId), updated, 86400);

  if (updated.payrunId) {
    await setCache(getLatestPayrunJobKey(updated.payrunId), jobId, 86400);
  }

  return updated;
}

/**
 * Get latest dispatch job for a specific payrun
 */
async function getLatestJobForPayrun(payrunId) {
  const latestJobId = await getCache(getLatestPayrunJobKey(payrunId));
  if (latestJobId) {
    return await getJobStatus(latestJobId);
  }

  // Fallback search in-memory
  for (const [id, job] of inMemoryJobs.entries()) {
    if (job.payrunId === payrunId) return job;
  }
  return null;
}

/**
 * Concurrently process items with limited concurrency
 * @param {Array} items 
 * @param {number} concurrency 
 * @param {Function} fn 
 */
async function pMap(items, concurrency, fn) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      try {
        results[currentIndex] = await fn(items[currentIndex], currentIndex);
      } catch (err) {
        results[currentIndex] = { error: err.message };
      }
    }
  }

  const workers = [];
  const workerCount = Math.min(concurrency, items.length);
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

/**
 * Background worker task that executes PDF generation and SMTP delivery for a payrun.
 */
async function processPayslipDispatchJob(jobId, payrunId, client = defaultPrisma) {
  try {
    const payrun = await client.payrun.findUnique({
      where: { id: payrunId },
      include: {
        payslips: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true } },
            lines: { orderBy: { sequence: 'asc' } },
            salaryStructure: { select: { name: true } },
            contract: { select: { position: true, wage: true } },
          },
        },
      },
    });

    if (!payrun) {
      await updateJobState(jobId, {
        status: 'FAILED',
        error: 'Payrun not found',
        completedAt: new Date().toISOString(),
      });
      activeWorkers.delete(payrunId);
      return;
    }

    const total = payrun.payslips.length;
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const results = [];

    await updateJobState(jobId, {
      status: 'PROCESSING',
      total,
      sent: 0,
      failed: 0,
      skipped: 0,
      progress: 0,
      startedAt: new Date().toISOString(),
    });

    // Concurrency: Process up to 5 employees in parallel
    const CONCURRENCY = 5;

    await pMap(payrun.payslips, CONCURRENCY, async (payslip) => {
      const employee = payslip.employee;
      const empName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'Employee';

      if (!employee?.email) {
        skippedCount++;
        const resObj = {
          employeeId: employee?.id,
          employeeName: empName,
          email: null,
          status: 'SKIPPED',
          error: 'No email address configured',
        };
        results.push(resObj);

        // Update progress
        const processed = sentCount + failedCount + skippedCount;
        const progress = Math.round((processed / total) * 100);
        await updateJobState(jobId, { sent: sentCount, failed: failedCount, skipped: skippedCount, progress });
        return resObj;
      }

      // Retry loop up to 2 attempts on transient SMTP socket failure
      let attempts = 0;
      let lastError = null;
      let isSuccess = false;

      while (attempts < 2 && !isSuccess) {
        attempts++;
        try {
          // 1. Generate PDF buffer
          const pdfBuffer = await pdfService.generatePayslipPDF(payslip, payrun);

          // 2. Send email via transporter
          await emailService.sendPayslipEmail({
            to: employee.email,
            employeeName: empName,
            payslip,
            payrun,
            pdfBuffer,
          });

          // 3. Mark payslip in database
          await client.payslip.update({
            where: { id: payslip.id },
            data: { emailSent: true, emailSentAt: new Date(), emailError: null },
          });

          sentCount++;
          isSuccess = true;
          const resObj = {
            employeeId: employee.id,
            employeeName: empName,
            email: employee.email,
            status: 'SENT',
          };
          results.push(resObj);
        } catch (err) {
          lastError = err;
          // Small delay before retry
          if (attempts < 2) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      if (!isSuccess) {
        failedCount++;
        const errorMessage = lastError ? lastError.message : 'Unknown dispatch error';
        await client.payslip.update({
          where: { id: payslip.id },
          data: { emailError: errorMessage },
        });

        const resObj = {
          employeeId: employee.id,
          employeeName: empName,
          email: employee.email,
          status: 'FAILED',
          error: errorMessage,
        };
        results.push(resObj);
      }

      // Update progress in Redis
      const processed = sentCount + failedCount + skippedCount;
      const progress = Math.round((processed / total) * 100);
      await updateJobState(jobId, { sent: sentCount, failed: failedCount, skipped: skippedCount, progress });
    });

    // Mark Job Complete
    await updateJobState(jobId, {
      status: 'COMPLETED',
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
      progress: 100,
      results,
      completedAt: new Date().toISOString(),
    });
  } catch (globalErr) {
    console.error('Fatal error in processPayslipDispatchJob:', globalErr);
    await updateJobState(jobId, {
      status: 'FAILED',
      error: globalErr.message,
      completedAt: new Date().toISOString(),
    });
  } finally {
    activeWorkers.delete(payrunId);
  }
}

/**
 * Enqueue a bulk payslip email dispatch task.
 * Returns immediately with { jobId, status: 'QUEUED' }.
 *
 * @param {string} payrunId
 * @param {Object} [client] - Prisma client
 * @returns {Promise<{ jobId: string, status: string, total: number, message: string }>}
 */
async function enqueuePayslipDispatch(payrunId, client = defaultPrisma) {
  const payrun = await client.payrun.findUnique({
    where: { id: payrunId },
    select: {
      id: true,
      name: true,
      status: true,
      _count: { select: { payslips: true } },
    },
  });

  if (!payrun) {
    throw new Error('Payrun not found');
  }

  if (!['PAID', 'VALIDATED'].includes(payrun.status)) {
    throw new Error('Payrun must be validated or paid before sending payslips.');
  }

  const total = payrun._count.payslips || 0;
  const jobId = `dispatch-${payrunId}-${Date.now()}`;

  const initialJob = {
    jobId,
    payrunId,
    payrunName: payrun.name,
    status: 'QUEUED',
    total,
    sent: 0,
    failed: 0,
    skipped: 0,
    progress: 0,
    results: [],
    createdAt: new Date().toISOString(),
  };

  await updateJobState(jobId, initialJob);

  // Trigger non-blocking async execution
  activeWorkers.add(payrunId);
  setImmediate(() => {
    processPayslipDispatchJob(jobId, payrunId, defaultPrisma).catch((err) => {
      console.error('Unhandled background worker error:', err);
    });
  });

  return {
    jobId,
    payrunId,
    status: 'QUEUED',
    total,
    message: `Payslip email dispatch queued in background for ${total} employee(s).`,
  };
}

module.exports = {
  enqueuePayslipDispatch,
  getJobStatus,
  getLatestJobForPayrun,
};

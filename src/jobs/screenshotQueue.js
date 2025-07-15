const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const screenshotService = require('../services/screenshotService');
const prisma = require('../services/prismaClient');

const redisConnection = new Redis(process.env.REDIS_TLS_URL, {
  maxRetriesPerRequest: null, // ✅ Required by BullMQ
  enableReadyCheck: false,    // Optional, but usually safe to disable for Upstash
});

const queue = new Queue('screenshotQueue', { connection: redisConnection });

function initQueue() {
  new Worker('screenshotQueue', async job => {
    const jobId = job.data.id;
    const result = await screenshotService.capture(job.data.url, jobId,job.data.viewport_width,
  job.data.viewport_height);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        screenshot_path: result.path,
        completed_at: new Date(),
      },
    });
    await screenshotService.sendWebhook(jobId, result.path);
  }, { connection: redisConnection });
}

async function addScreenshotJob(job) {
  await queue.add('capture', job);
}

module.exports = { initQueue, addScreenshotJob };
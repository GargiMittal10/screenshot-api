const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const screenshotService = require('../services/screenshotService');
const prisma = require('../services/prismaClient');

const connection = new Redis(`redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
const queue = new Queue('screenshotQueue', { connection });

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
  }, { connection });
}

async function addScreenshotJob(job) {
  await queue.add('capture', job);
}

module.exports = { initQueue, addScreenshotJob };
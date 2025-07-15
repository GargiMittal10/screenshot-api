const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { addScreenshotJob } = require('../jobs/screenshotQueue');
const axios = require('axios');
const path = require('path');
const prisma = new PrismaClient();

async function sendWebhookWithRetry(url, payload, retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await axios.post(url, payload);
      console.log(`Webhook sent successfully on attempt ${attempt}`);
      return true;
    } catch (error) {
      console.error(`Webhook failed on attempt ${attempt}:`, error.message);
      if (attempt < retries) await new Promise(res => setTimeout(res, delay));
    }
  }
  return false;
}

// POST /screenshots
router.post('/', async (req, res) => {
  const { url, webhook_url, force, viewport } = req.body;
  if (!url || !webhook_url) {
    return res.status(400).json({ error: 'Missing url or webhook_url' });
  }
  const viewport_width = viewport?.width || 1280;
  const viewport_height = viewport?.height || 720;

  // Check if a completed screenshot already exists for the same URL (unless force is true)
  if (!force) {
    const existingJob = await prisma.job.findFirst({
      where: { url, status: 'completed' },
      orderBy: { created_at: 'desc' },
    });

    if (existingJob) {
      return res.json({
        job_id: existingJob.id,
        status: 'completed',
        screenshot_url: `http://localhost:3000/public/${path.basename(existingJob.screenshot_path)}`
      });
    }
  }

  // Otherwise, create a new job
  const job = await prisma.job.create({
    data: {
      url,
      webhook_url,
      status: 'queued',
      viewport_width,
      viewport_height,
    },
  });

  await addScreenshotJob(job, viewport_width, viewport_height);
  res.json({ job_id: job.id, status: 'queued' });
});


// GET /screenshots/:job_id/status
router.get('/:job_id/status', async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.job_id } });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ job_id: job.id, status: job.status });
});

// GET /screenshots/:job_id
router.get('/:job_id', async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.job_id } });
  if (!job || job.status !== 'completed') return res.status(404).json({ error: 'Screenshot not available' });
  res.json({
    file_name: job.screenshot_path,
    timestamp: job.completed_at,
    screenshot_url: `http://localhost:3000/public/${path.basename(job.screenshot_path)}`,
  });
});

module.exports = router;

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

async function capture(url, jobId, width = 1280, height = 720) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(url, { waitUntil: 'networkidle2' });

  const filePath = path.join('screenshots', `${jobId}.png`);
  await page.screenshot({ path: filePath, fullPage: true });

  await browser.close();
  return { path: filePath };
}

async function sendWebhook(jobId, filePath) {
  const job = await require('./prismaClient').job.findUnique({ where: { id: jobId } });
  const screenshot_url = `http://localhost:3000/public/${path.basename(filePath)}`;
  try {
    await axios.post(job.webhook_url, {
      job_id: jobId,
      status: 'completed',
      screenshot_url,
    });
  } catch (err) {
    console.error('Webhook failed:', err.message);
  }
}
module.exports = { capture, sendWebhook };
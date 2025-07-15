const express = require('express');
const bodyParser = require('body-parser');
const screenshotRoutes = require('./routes/screenshotRoutes');
const { initQueue } = require('./jobs/screenshotQueue');
const { ensureScreenshotDir } = require('./services/utils');
const { apiKeyMiddleware } = require('./middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');


const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

app.use(bodyParser.json());
app.use('/public', express.static('screenshots'));

// API key protection
app.use(apiKeyMiddleware);
app.use('/screenshots', screenshotRoutes);

// Admin endpoint to list all jobs
app.get('/admin/jobs', async (req, res) => {
  const jobs = await prisma.job.findMany({ orderBy: { created_at: 'desc' } });
  res.json(jobs);
});

ensureScreenshotDir();
initQueue();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const fs = require('fs');
function ensureScreenshotDir() {
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
  }
}
module.exports = { ensureScreenshotDir };
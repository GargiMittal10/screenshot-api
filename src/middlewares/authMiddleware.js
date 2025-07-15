module.exports.apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.API_KEY || 'my-secret-key';

  if (req.path.startsWith('/public')) {
    return next(); // Allow public screenshots access
  }

  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized. Missing or invalid API key.' });
  }
  next();
};

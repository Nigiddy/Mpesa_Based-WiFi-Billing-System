// Express middleware to enforce HTTPS in production
module.exports = function enforceHTTPS(req, res, next) {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
};

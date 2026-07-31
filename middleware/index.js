const express = require('express');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
// const helmet = require('helmet');
const xssClean = require('xss-clean');
const expressRateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const logger = require('./logger');

const configureMiddleware = (app) => {
  // Body-parser middleware
  app.use(express.json());

  // Cookie Parser
  app.use(cookieParser());

  // MongoDB data sanitizer
  app.use(mongoSanitize());

  // Helmet improves API security by setting some additional header checks
  // app.use(helmet());

  app.use(xssClean());

  // Add rate limit to API only during non-production/local runs to avoid blocking Netlify proxy IPs
  if (process.env.NODE_ENV !== 'production') {
    app.use(
      expressRateLimit({
        windowMs: 10 * 60 * 1000,
        max: 100,
      }),
    );
  }

  // Prevent http param pollution
  app.use(hpp());

  // Enable CORS
  app.use(cors());

  // Custom logging middleware
  app.use(logger);
};

module.exports = configureMiddleware;

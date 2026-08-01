 const express = require('express');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
// const helmet = require('helmet');
const xssClean = require('xss-clean');
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

  // NOTE: Rate limiting disabled to prevent blocking active Socket.io long-polling/sync calls

  // Prevent http param pollution
  app.use(hpp());

  // Enable CORS
  app.use(cors());

  // Custom logging middleware
  app.use(logger);
};

module.exports = configureMiddleware;

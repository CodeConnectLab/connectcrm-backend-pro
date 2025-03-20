
/**
 * Express configuration
 */

'use strict';

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./environment');
const winston = require('winston');
const mailer = require('../mailer');

const allowedOrigins = [
  'https://crm.redkaizen.in',
  'http://localhost:9000',
  'http://13.235.233.186',
  'http://13.235.233.186:3000'
];

module.exports = function (app) {
  // CORS configuration
  app.use(cors({
    origin: function (origin, callback) {
      // allow requests with no origin like mobile apps or curl
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use('/api/static', express.static(path.join(__dirname, '../', 'uploads')));
  app.use('/api/temp', express.static(path.join(__dirname, '../', 'temp')));
  app.use(compression());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({
    limit: '10mb',
    extended: true,
    verify: function (req, res, buf, encoding) {
      req.rawBody = buf; // get rawBody
    }
  }));

  app.use(methodOverride());
  app.use(cookieParser());
};


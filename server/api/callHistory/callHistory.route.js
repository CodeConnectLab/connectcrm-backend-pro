'use strict';

const express = require('express'),
  { joiValidate } = require("../../helpers/apiValidation.helper"),
  controller = require('./callHistory.controller'),
  auth = require('../auth/auth.service'),
  // activity = require('../activity/activity.json'),
  validationInputs = require('./callHistory.validation'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true,
  };



/////  Add Call history of users
router.post(usersVersion + "/call-history",
    auth.isAuthenticated({
  }),
  /// joiValidate(validationInputs.validateCallHistory, options),
  controller.saveCallHistory);




///////// Call report 
router.post(usersVersion+ "/call-report",
   auth.isAuthenticated({
   }),
   //joiValidate(validationInputs.validateCallReport, options),
   controller.callReport)

///////// product sale report
router.post(usersVersion+ "/product-sale-report",
  auth.isAuthenticated({

  }),
  joiValidate(validationInputs.validateProductSaleReport, options),
  controller.productSaleReport)

  /////////   get call detail by date and user
  router.post(usersVersion+ "/getCallList",
    auth.isAuthenticated({
  
    }),
    joiValidate(validationInputs.validateGetCallList, options),
    controller.getCallList)














  module.exports = router;
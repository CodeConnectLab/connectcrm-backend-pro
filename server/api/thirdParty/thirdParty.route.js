'use strict'

const express = require('express'),
  { joiValidate } = require('../../helpers/apiValidation.helper'),
  controller = require('./thirdParty.controller'),
  auth = require('../auth/auth.service'),
  // activity = require('../activity/activity.json'),
  validationInputs = require('./thirdParty.validation'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true
  }

router.get(
  usersVersion + '/getCurlApi',
  auth.isAuthenticated({
   // adminOnly: true
  }),
  controller.getCurlApi
)

router.post(
    usersVersion + '/outsource-lead',
    // auth.isAuthenticated({
    //  // adminOnly: true
    // }),
    controller.OutsourceLead
  )

//////////////////facebook lead gen webhook
  router.get(
    usersVersion + '/facebook-lead-gen-webhook',
    // auth.isAuthenticated({
    //   // adminOnly: true
    // }),
    controller.facebookLeadGenWebhookVarify
  )

  router.post(
    usersVersion + '/facebook-lead-gen-webhook',
    // auth.isAuthenticated({
    //   // adminOnly: true
    // }),
    controller.facebookLeadGenWebhook
  )

  /////////////// second facebook account lead gen webhook
  router.get(
    usersVersion + '/facebook-lead-gen-webhook-second-account',
    // auth.isAuthenticated({
    //   // adminOnly: true
    // }),
    controller.facebookLeadGenWebhookVarifySecondAccount
  )

  router.post(
    usersVersion + '/facebook-lead-gen-webhook-second-account',
    // auth.isAuthenticated({
    //   // adminOnly: true
    // }),
    controller.facebookLeadGenWebhookSecondAccount
  )
  /////////////// second facebook account lead gen webhook

  
  /////////get facebook page list
  router.get(
    usersVersion + '/facebook-page',
    auth.isAuthenticated({
      // adminOnly: true
    }),
    // joiValidate(validationInputs.getFacebookPageList),
    controller.getFacebookPageList
  )
  ////////// uodate facebook page
  router.put(
    usersVersion + '/facebook-page/:id',
    auth.isAuthenticated({
      // adminOnly: true
    }),
    // joiValidate(validationInputs.updateFacebookPage),
    controller.UpdateFacebookPageList
  )



module.exports = router

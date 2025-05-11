'use strict';

const express = require('express'),
  { joiValidate } = require("../../helpers/apiValidation.helper"),
  controller = require('./booking.controller'),
  auth = require('../auth/auth.service'),
  // activity = require('../activity/activity.json'),
  validationInputs = require('./booking.validation'),
  router = express.Router(),
  usersVersion = '/v1',
  options = {
    wantResponse: true,
  };



/////  Add Call history of users
router.post(usersVersion + "/add-booking",
    auth.isAuthenticated({
  }),
  controller.addBooking);

  //////////update booking
router.put(usersVersion + "/update-booking/:id",
    auth.isAuthenticated({
  }),
  controller.updateBooking);

/////// Get booking list
router.get(usersVersion + "/get-booking-list",
    auth.isAuthenticated({
  }),
    controller.getBookingList);

/////// Get Upcomming booking 
router.get(usersVersion + "/get-upcomming-booking",
    auth.isAuthenticated({
  }),
    controller.getUpcomingBooking);    

/////// Get Booking details By ID
router.get(usersVersion + "/get-booking-details/:id",
    auth.isAuthenticated({
  }),
    controller.getBookingDetails);



  module.exports = router;

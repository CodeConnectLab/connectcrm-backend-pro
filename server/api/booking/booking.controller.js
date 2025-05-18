const service = require('./booking.service');

///////  get lead details
exports.addBooking = (req, res) => {
    return service.addBooking(req.body, req.user, res)
        .then((result) => responseHandler.success(res, result, "Booking added successfully!", 200))
        .catch((error) => responseHandler.error(res, error, error.message, 500));
}

////////  update booking
exports.updateBooking = (req, res) => {
    return service.updateBooking(req.params.id, req.body, req.user)
        .then((result) => responseHandler.success(res, result, "Booking updated successfully!", 200))
        .catch((error) => responseHandler.error(res, error, error.message, 500));
}

//////////  get booking details
exports.getBookingDetails = (req, res) => {
    return service.getBookingDetails(req.params.id, req.user)
        .then((result) => responseHandler.success(res, result, "Booking details retrieved successfully!", 200))
        .catch((error) => responseHandler.error(res, error, error.message, 500));
}
////////  get booking list
exports.getBookingList = (req, res) => {
    const queryParams = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        search: req.query.search,
        employee: req.query.employee,
        tlcp: req.query.tlcp,
        avp: req.query.avp,
        vp: req.query.vp,
        as: req.query.as,
        agm: req.query.agm,
        gm: req.query.gm,
        vertical: req.query.vertical,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
    };
    return service.getBookingList(queryParams, req.user)
        .then((result) => responseHandler.success(res, result, "Booking list retrieved successfully!", 200))
        .catch((error) => responseHandler.error(res, error, error.message, 500));
}

exports.getNewBooking = (req, res) => {
      const queryParams = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        search: req.query.search,
        employee: req.query.employee,
        tlcp: req.query.tlcp,
        avp: req.query.avp,
        vp: req.query.vp,
        as: req.query.as,
        agm: req.query.agm,
        gm: req.query.gm,
        vertical: req.query.vertical,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
    };
    return service.getNewBooking(queryParams, req.user)
        .then((result) => responseHandler.success(res, result, "New Booking list retrieved successfully!", 200))
        .catch((error) => responseHandler.error(res, error, error.message, 500));
}

exports.getUpcomingBooking = (req, res) => {
 const queryParams = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        search: req.query.search,
        employee: req.query.employee,
        tlcp: req.query.tlcp,
        avp: req.query.avp,
        vp: req.query.vp,
        as: req.query.as,
        agm: req.query.agm,
        gm: req.query.gm,
        vertical: req.query.vertical,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
    };
    return service.getUpcomingBooking(queryParams, req.user)
        .then((result) => responseHandler.success(res, result, "Upcomming Booking list retrieved successfully!", 200))
        .catch((error) => responseHandler.error(res, error, error.message, 500));
}

exports.getBookingOverview = (req, res) => {
    return service.getBookingOverview(req.user)
        .then((result) => responseHandler.success(res, result, "Booking overview retrieved successfully!", 200))
        .catch((error) => responseHandler.error(res, error, error.message, 500));
}
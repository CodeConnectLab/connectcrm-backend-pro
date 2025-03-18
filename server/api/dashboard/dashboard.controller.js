const service=require('./dashboard.service');

exports.getCalendarData = (req, res) => {
    return service.getCalendarData(req.body,req.user)
     .then((result)=>responseHandler.success(res, result,"Get Calendar Data successfully!", 200))
     .catch((error) => responseHandler.error(res, error, error.message, 500));
}


exports.getDashboardMetrics = (req, res) => {
    return service.getDashboardMetrics(req.query, req.user)
        .then((result) => responseHandler.success(res, result, "Dashboard metrics fetched successfully!", 200))
        .catch((error) => responseHandler.error(res, error, error.message, 500));
};


const service = require("./thirdParty.service")
const service1 = require("./thirdParty1.service")

exports.getCurlApi=(req,res,next)=>{
    return service.getCurlApi(req.query.leadSource, req.user)
    .then(result => responseHandler.success(res, result, "Feature creation successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};


exports.OutsourceLead=(req,res,next)=>{
    return service.OutsourceLead(req.query.apikey,req.body)
    .then(result => responseHandler.success(res, result, "Feature creation successful!", 200))
    .catch(error => responseHandler.error(res, error, error.message, 500));
};

exports.facebookLeadGenWebhookVarify = (req, res) => {
   //  console.log('Facebook lead gen webhook verification request received:', req);
   console.log('Facebook lead gen webhook verification request received:');
    const verifyToken = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    console.log('verifyToken:', verifyToken);
    console.log('challenge:', challenge);

    if (verifyToken === process.env.FACEBOOK_VERIFY_TOKEN) {
        console.log('Webhook verification successful');
        return res.status(200).send(challenge);
    } else {
        return res.status(403).send('Forbidden');
    }
};

exports.facebookLeadGenWebhook = (req, res) => {
     console.log("🔥 Facebook webhook POST hit:", JSON.stringify(req.body, null, 2));
    return service.facebookLeadGenWebhook(req.query, req.body)
        .then(result => responseHandler.success(res, result, "Facebook lead gen webhook processed successfully!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
};



exports.facebookPageWebhook = (req, res) => {
    console.log("🔥 Facebook page webhook POST hit:", JSON.stringify(req.body, null, 2));
    return service.facebookPageWebhook(req.body, req.user)
        .then(result => responseHandler.success(res, result, "Facebook page added successfully!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.getFacebookPageList = (req, res) => {
    console.log("🔥 Get Facebook page list request received");
    return service.getFacebookPageList(req.user)
        .then(result => responseHandler.success(res, result, "Facebook page list retrieved successfully!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}

exports.UpdateFacebookPageList = (req, res) => {
    console.log("🔥 Get Facebook page details request received for pageId:", req.params.pageId);
    return service.UpdateFacebookPageList(req.params.pageId,req.body, req.user)
        .then(result => responseHandler.success(res, result, "Facebook page details retrieved successfully!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
}





////////////////////// second facebook account lead gen webhook verification
exports.facebookLeadGenWebhookVarifySecondAccount = (req, res) => {
    //  console.log('Facebook lead gen webhook verification request received:', req);
    console.log('Facebook lead gen webhook verification request received:');
    const verifyToken = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    console.log('verifyToken:', verifyToken);
    console.log('challenge:', challenge);
    if (verifyToken === process.env.FACEBOOK_VERIFY_TOKEN) {
        console.log('Webhook verification successful');
        return res.status(200).send(challenge);
    } else {
        return res.status(403).send('Forbidden');
    }
  }
  exports.facebookLeadGenWebhookSecondAccount = (req, res) => {
    console.log("🔥 Facebook webhook POST hit:", JSON.stringify(req.body, null, 2));
    return service1.facebookLeadGenWebhook(req.query, req.body)
        .then(result => responseHandler.success(res, result, "Facebook lead gen webhook processed successfully!", 200))
        .catch(error => responseHandler.error(res, error, error.message, 500));
  }
  ////////////////////// second facebook account lead gen webhook
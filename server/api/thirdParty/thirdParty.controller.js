

const service = require("./thirdParty.service")

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


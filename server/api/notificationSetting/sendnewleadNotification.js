const admin = require('firebase-admin');
const UserModel=require('../user/user.model')
const Modelnotification=require('./notification.model')
require('dotenv').config({
	path: __dirname + '/config/.env'
});

const serviceAccount = {
  type: process.env.GOOGLE_TYPE,
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix newlines
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
  universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
};


if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function sendNewLeadNotification(agentUser, companyId) {
    try {

          const agentUserDetails = await UserModel.findOne({ _id: agentUser });
          if(!agentUserDetails){
            return 'Agent user not found';
          }
          let title = 'New Lead Assigned';
          let body = 'New lead is assigned to you';

          const payload = {
            token: agentUserDetails?.fcmMobileToken || agentUserDetails?.fcmWebToken,
            notification: {
              title: title,
              body: body,
            },
          };

          await admin.messaging().send(payload).then((result)=>{
            console.log("New lead notification sent successfully to assigned agent",result);
          }).catch((error)=>{
            console.error('Error sending new lead notification:', error);
          });
          return 'New lead notification sent successfully';
    } catch (error) {
        console.error('Error sending new lead notification:', error);
    }
}


exports.sendNewLeadNotification = sendNewLeadNotification;
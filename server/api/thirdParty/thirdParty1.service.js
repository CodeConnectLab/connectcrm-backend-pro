const crypto = require('crypto')
const LeadModel = require('../lead/lead.model')
const LeadSourceModel = require('../leadSources/leadSources.model')
const CompanyModel = require('../company/company.model')
const FacebookPage = require('./FacebookPage.model');
const axios = require("axios");
// Key derivation function to ensure proper key length
const deriveKey = (key) => {
  return crypto.scryptSync(key, 'salt', 32) // Returns a 32-byte key
}

// Use a proper encryption key (32 bytes)
const ENCRYPTION_KEY = deriveKey(
  process.env.ENCRYPTION_KEY || 'your-secret-key-here'
)
const IV_LENGTH = 16

const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return `${iv.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Encryption failed')
  }
}

const decrypt = (text) => {
  try {
    const [ivHex, encryptedHex] = text.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Invalid API key format')
  }
}

const generateApiKey = (leadSource, companyId) => {
  const data = `${leadSource}_${companyId}`
  return encrypt(data)
}

exports.getCurlApi = async (leadSource, user) => {
  try {
    if (!leadSource || !user?.companyId) {
      throw new Error('LeadSource and companyId are required')
    }

    // Verify leadSource and companyId exist in database
    const [leadSourceDoc, companyDoc] = await Promise.all([
      LeadSourceModel.findById(leadSource),
      CompanyModel.findById(user.companyId)
    ])

    if (!leadSourceDoc || !companyDoc) {
      throw new Error('Invalid LeadSource or Company ID')
    }

    const apiKey = generateApiKey(leadSource, user.companyId)
    const baseUrl = process.env.BASE_URL || 'https://api.codeconnect.in/api/v1'

    const curlCommand = `curl --location '${baseUrl}/outsource-lead?apikey=${apiKey}' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: {{token}}' \
--data-raw '{
    "firstName": "Arun Kumar",
    "email": "jane.smith@example.com",
    "contactNumber": "9667432436",
    "description":"this lead come from ",
    "fullAddress":"Delhi ,India",
    "city": "Bangalore" 
}'`

    return {
      //   apiKey,
      curlCommand
      //   leadSource,
      //   companyId: user.companyId
    }
  } catch (error) {
    console.error('Error in getCurlApi:', error)
    return Promise.reject(error)
  }
}

exports.OutsourceLead = async (apiKey, body) => {
  try {
    if (!apiKey) {
      throw new Error('API key is required')
    }
    let decryptedData
    try {
      decryptedData = decrypt(apiKey)
    } catch (error) {
      throw new Error('Invalid API key format')
    }
    const [leadSource, companyId] = decryptedData.split('_')
    if (!leadSource || !companyId) {
      throw new Error('Invalid API key')
    }
    // Verify against database
    const LeadSource = await LeadSourceModel.findById(leadSource)
    const Company = await CompanyModel.findById(companyId)
    if (!LeadSource || !Company) {
      throw new Error('Invalid API key - Invalid LeadSource or Company')
    }
    // Create lead data object
    const leadData = {
      ...body,
      leadAddType: 'ThirdParty',
      leadSource: leadSource,
      companyId: companyId,
      // leadStatus: '67b97672239b25980850a734',
      /// i want current time + 6 minutes
      followUpDate: new Date(), /// for send notification after 5 minutes in app
      createdAt: new Date()
    }
    // Save to Lead table
    const newLead = new LeadModel(leadData)
    const savedLead = await newLead.save()
    if (!savedLead) {
      throw new Error('Failed to save lead')
    }
    // Return the saved lead data
    return {
      lead: savedLead
    }
  } catch (error) {
    console.error('Error in OutsourceLead:', error)
    return Promise.reject(error)
  }
}

// Optional: Add a utility function to decode API key (for debugging)
exports.decodeApiKey = (apiKey) => {
  try {
    const decryptedData = decrypt(apiKey)
    const [leadSource, companyId] = decryptedData.split('_')
    return { leadSource, companyId }
  } catch (error) {
    throw new Error('Invalid API key')
  }
}

///////////////////facebook lead gen webhook
///////////////////facebook lead gen webhook

async function getPageDetailsFromDB(pageId) {
  try {
    const page = await FacebookPage.findOne({ pageId });
    if (!page) {
      console.error(`❌ No page config found for page ID: ${pageId}`);
      return null;
    }
    return {
      accessToken: page?.accessToken,
      companyId: page?.companyId,
      leadSource: page?.leadSource,
      pageName: page?.pageName,
      pageId: page?.pageId
    };
  } catch (error) {
    console.error(`❌ Error fetching page details from DB for pageId ${pageId}:`, error.message);
    return null;
  }
}

const APP_ID = process.env.FACEBOOK_APP_ID1;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET1;

// ✅ Check if access token is valid
async function isAccessTokenValid(token) {
  const url = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${APP_ID}|${APP_SECRET}`;
  try {
    const res = await axios.get(url);
    return res.data?.data?.is_valid;
  } catch (err) {
    console.error("Access token validation error:", err.message);
    return false;
  }
}

// ✅ Refresh access token
async function refreshAccessToken(currentToken) {
  const url = `https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${currentToken}`;
  try {
    const res = await axios.get(url);
    return res.data?.access_token;
  } catch (err) {
    console.error("Error refreshing access token:", err.message);
    return null;
  }
}

// ✅ Main Webhook Handler
exports.facebookLeadGenWebhook = async (query, body) => {
      
  try {
    console.log("🔥 Facebook webhook POST hit:", JSON.stringify(body, null, 2));

    if (!body?.entry?.[0]?.changes?.[0]) {
      console.log("Invalid payload structure");
      return { message: "Invalid payload structure" };
    }

    const changes = body.entry[0].changes[0];
    const pageId = body.entry[0].id;

    if (changes.field !== 'leadgen') {
      console.log("Not a leadgen webhook");
      return { message: "Not a leadgen webhook" };
    }

    const pageDetails = await getPageDetailsFromDB(pageId);
    console.log("pageDetails", pageDetails);
    if (!pageDetails || !pageDetails.accessToken) {
      throw new Error(`No access token found in DB for page ID: ${pageId}`);
    }
    
    let ACCESS_TOKEN = pageDetails.accessToken;
    const { leadgen_id, form_id, created_time, ad_id } = changes.value;

    console.log("📌 Processing leadgen_id:", leadgen_id);
    console.log("📌 Webhook data - ad_id:", ad_id, "form_id:", form_id);

    // ✅ Validate or Refresh Token if needed
    const valid = await isAccessTokenValid(ACCESS_TOKEN);
    if (!valid) {
      console.log("🔄 Token invalid, attempting to refresh...");
      const refreshed = await refreshAccessToken(ACCESS_TOKEN);
      if (!refreshed) {
        throw new Error("Unable to refresh access token.");
      }
      ACCESS_TOKEN = refreshed;
      console.log("✅ Token refreshed successfully");
    } else {
      console.log("✅ Token is valid, proceeding...");
    }

    // ✅ Fetch Lead Data
    const leadResponse = await axios.get(
      `https://graph.facebook.com/v23.0/${leadgen_id}?fields=field_data,ad_id&access_token=${ACCESS_TOKEN}`
    );
    const leadData = leadResponse.data;

    // ✅ Get ad_id from webhook or lead data (lead data me bhi ad_id ho sakta hai)
    const finalAdId = ad_id || leadData?.ad_id;
    console.log("📌 Final ad_id (from webhook or lead data):", finalAdId);

    // ✅ Create Lead Object
    const fields = leadData?.field_data || [];
    console.log("📋 Lead Data:", fields);
    const fieldMap = Object.fromEntries(fields.map(f => [f.name, f.values?.[0]]));
    console.log("📋 Lead Data:", fieldMap);

    let adName = '';
    let campaignName = '';

    // ✅ Get ad and campaign details only if ad_id exists
    if (finalAdId) {
      try {
        // 1. Get ad details (ad name + campaign id)
        const adDetailsRes = await axios.get(
          `https://graph.facebook.com/v23.0/${finalAdId}?fields=name,campaign_id&access_token=${ACCESS_TOKEN}`
        );
        console.log("📋 Ad Details:", adDetailsRes.data);
        adName = adDetailsRes.data?.name || '';
        const campaignId = adDetailsRes.data?.campaign_id;
        console.log("📋 Campaign ID from ad:", campaignId);
        
        // 2. Get campaign name
        if (campaignId) {
          try {
            const campaignDetailsRes = await axios.get(
              `https://graph.facebook.com/v23.0/${campaignId}?fields=name&access_token=${ACCESS_TOKEN}`
            );
            console.log("📋 Campaign Details:", campaignDetailsRes.data);
            campaignName = campaignDetailsRes.data?.name || '';
          } catch (campaignError) {
            console.error("⚠️ Error fetching campaign details:", campaignError.message);
            campaignName = '';
          }
        }
      } catch (adError) {
        console.error("⚠️ Error fetching ad details:", adError.message);
        // Continue without ad/campaign details
        adName = '';
        campaignName = '';
      }
    } else {
      console.log("ℹ️ No ad_id found in webhook or lead data - lead came directly from form (not from ad)");
    }

let formName = '';
if (form_id) {
  try {
    const formRes = await axios.get(
      `https://graph.facebook.com/v23.0/${form_id}?fields=name&access_token=${ACCESS_TOKEN}`
    );
    formName = formRes.data?.name || '';
  } catch (e) {
    formName = '';
  }
}
    console.log("📊 Final values - campaignName:", campaignName, "adName:", adName, "formName:", formName);
    if(campaignName===''){
       campaignName = pageDetails?.pageName || '';
    }
    const leadPayload = {
      fbLeadGenId: leadgen_id,
      fbLeadGenFormId: form_id,
      fbLeadGenAdId: finalAdId || null,
      companyId: pageDetails?.companyId || '67b2c739b9844cf70ce71233',
      // leadSource: pageDetails?.leadSource || '67b9761e239b25980850a707', // Default or provided lead source
      leadAddType: "ThirdParty",
      fbCompainName: formName || 'Unknown Campaign',
      campaignName: campaignName || pageDetails?.pageName || '', // <-- Add this line
      adName: adName || pageDetails?.pageName || '', // <-- Add this line
      firstName: fieldMap.full_name || fieldMap.first_name || '',
      email: fieldMap?.email || '',
      city: fieldMap?.city || '', 
      contactNumber: fieldMap.phone_number || '',
      description: "Lead generated from Facebook", 
      // leadStatus: '67b97672239b25980850a734',
      /// i want current time + 6 minutes
      // followUpDate: new Date(new Date()), /// for send notification after 5 minutes in app
      followUpDate: new Date(),
    };

    console.log("📥 Saving lead to DB:", leadPayload);
    const newLead = new LeadModel(leadPayload);
    const saved = await newLead.save();

    return {
      leadgenId: leadgen_id,
      formId: form_id,
      createdTime: created_time,
      adId: finalAdId || null,
      leadId: saved._id,
      message: "Facebook lead gen webhook processed successfully"
    };

  } catch (error) {
    console.error("❌ Error in facebookLeadGenWebhook:", error.message);
    fs.appendFileSync(LOG_FILE, `❌ Error: ${error.stack}\n`);

    return {
      error: error.message,
      message: "Error processing webhook but acknowledged"
    };
  }
};


///////add facebook page
exports.facebookPageWebhook = async (body, user) => {
  const { pageId, pageName, accessToken, } = body;
  try {
    let leadSource = body?.leadSource || '67b9761e239b25980850a707'; // Default or provided lead source
    const companyId = user?.companyId;
    const page = await FacebookPage.findOneAndUpdate(
      { pageId },
      { pageName, accessToken, leadSource, companyId },
      { upsert: true, new: true }
    );
    return page;
  } catch (err) {
    console.error("Error in facebookPageWebhook:", err);
    return Promise.reject(error)
  }
}

/////////get facebook page list
exports.getFacebookPageList = async (user) => {
  try {
    const pages = await FacebookPage.find({ companyId: user.companyId }).sort({ createdAt: -1 });
    return pages;
  } catch (error) {
    console.error("Error fetching Facebook pages:", error);
    return Promise.reject(error);
  }
}

/////////update facebook page
exports.UpdateFacebookPageList = async (Id, body, user) => {

  const { pageId, pageName, accessToken, } = body;
  try {
    const page = await FacebookPage.findOneAndUpdate(
      { Id },
      { pageName, accessToken, pageId },
      { new: true }
    );
    if (!page) {
      throw new Error('Page not found');
    }
    return page;
  } catch (error) {
    console.error("Error updating Facebook page:", error);
    return Promise.reject(error);
  }


}


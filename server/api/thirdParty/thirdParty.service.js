const crypto = require('crypto')
const LeadModel = require('../lead/lead.model')
const LeadSourceModel = require('../leadSources/leadSources.model')
const CompanyModel = require('../company/company.model')
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
      followUpDate: new Date(),
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


exports.facebookLeadGenWebhook1 = async (query, body) => {
  try {
    console.log("🔥 Facebook webhook POST hit:", JSON.stringify(body, null, 2));
    
    if (!body || !body.entry || !body.entry[0] || !body.entry[0].changes) {
      console.log("Invalid webhook payload structure");
      return { message: "Invalid payload structure" };
    }

    const entry = body.entry[0];
    const changes = entry.changes[0];
    
    if (changes.field !== 'leadgen') {
      console.log("Not a leadgen webhook");
      return { message: "Not a leadgen webhook" };
    }

    const { leadgen_id, form_id, created_time, ad_id } = changes.value;
    
    console.log("Processing leadgen_id:", leadgen_id);

    // Fetch lead details from Facebook
    const leadDetailsRes = await axios.get(
      `https://graph.facebook.com/v23.0/${leadgen_id}?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`
    );
    
    const leadData = leadDetailsRes.data;
    console.log("Lead data from Facebook:", JSON.stringify(leadData, null, 2));

    // Create lead object
    const leadDataObject = {
      fbLeadGenId: leadgen_id,
      fbLeadGenFormId: form_id,
      fbLeadGenAdId: ad_id,
      companyId: "67b2c739b9844cf70ce71233",
      leadSource: "67b9761e239b25980850a707",
      leadAddType: "ThirdParty",
      firstName: leadData?.field_data?.find(f => f.name === "full_name")?.values?.[0] || '',
      email: leadData?.field_data?.find(f => f.name === "email")?.values?.[0] || '',
      contactNumber: leadData?.field_data?.find(f => f.name === "phone_number")?.values?.[0] || '',
      description: "Lead generated from Facebook",
    };

    console.log("Creating lead with data:", leadDataObject);

    const newLead = new LeadModel(leadDataObject);
    const savedLead = await newLead.save();

    console.log("Lead saved successfully:", savedLead._id);

    return {
      leadgenId: leadgen_id,
      formId: form_id,
      createdTime: created_time,
      adId: ad_id,
      message: "Facebook lead gen webhook processed successfully"
    };

  } catch (error) {
    console.error("❌ Error in facebookLeadGenWebhook:", error);
    // Still return success to Facebook to avoid retries
    return { 
      error: error.message,
      message: "Error processing webhook but acknowledged"
    };
  }
};



const APP_ID = process.env.FACEBOOK_APP_ID;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;

let ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN; // Will refresh if expired

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

    if (changes.field !== 'leadgen') {
      console.log("Not a leadgen webhook");
      return { message: "Not a leadgen webhook" };
    }

    const { leadgen_id, form_id, created_time, ad_id } = changes.value;

    console.log("📌 Processing leadgen_id:", leadgen_id);

    // ✅ Validate or Refresh Token
    const valid = await isAccessTokenValid(ACCESS_TOKEN);
    if (!valid) {
      const refreshed = await refreshAccessToken(ACCESS_TOKEN);
      if (!refreshed) throw new Error("Unable to refresh access token.");
      ACCESS_TOKEN = refreshed;
    }

    // ✅ Fetch Lead Data
    const leadResponse = await axios.get(
      `https://graph.facebook.com/v17.0/${leadgen_id}?access_token=${ACCESS_TOKEN}`
    );
    const leadData = leadResponse.data;

   

    // ✅ Create Lead Object
    const fields = leadData?.field_data || [];
    const fieldMap = Object.fromEntries(fields.map(f => [f.name, f.values?.[0]]));

    const leadPayload = {
      fbLeadGenId: leadgen_id,
      fbLeadGenFormId: form_id,
      fbLeadGenAdId: ad_id,
      companyId: "67b2c739b9844cf70ce71233",
      leadSource: "67b9761e239b25980850a707",
      leadAddType: "ThirdParty",
      firstName: fieldMap.full_name || fieldMap.first_name || '',
      email: fieldMap.email || '',
      contactNumber: fieldMap.phone_number || '',
      description: "Lead generated from Facebook",
    };

    console.log("📥 Saving lead to DB:", leadPayload);
    const newLead = new LeadModel(leadPayload);
    const saved = await newLead.save();

   

    return {
      leadgenId: leadgen_id,
      formId: form_id,
      createdTime: created_time,
      adId: ad_id,
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


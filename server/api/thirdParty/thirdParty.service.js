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
        if (!query || !body) {
            throw new Error('Query and body are required')
        }

        // Process the incoming data from Facebook
        const { leadgen_id, form_id, created_time, ad_id } = body
        console.log('Received Facebook lead gen data:', body)
        const companyId = '67b2c739b9844cf70ce71233';
        const leadSource ='67b9761e239b25980850a707';
        const leadAddType = 'ThirdParty';
        ////now getting lead information from facebook graph api
        // You can use the leadgen_id to fetch more details from Facebook Graph API if needed
        // For example, you can use the Facebook Graph API to get more details about the lead
        // const leadDetails = await fetch(`https://graph.facebook.com/v12.0/${leadgen_id}?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`)
        // const leadData = await leadDetails.json()
        const leadDetails = await axios.get(`https://graph.facebook.com/v12.0/${leadgen_id}?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`);
        const leadData = leadDetails.data;
        console.log('Lead details from Facebook:', leadData)
        // Create a lead data object
        const leadDataObject = {
            fbLeadGenId: leadgen_id,
            fbLeadGenFormId: form_id,
            fbLeadGenAdId: ad_id,
            companyId: companyId,
            leadSource: leadSource,
            leadAddType: leadAddType,
            firstName: leadData?.first_name || '',
            lastName: leadData?.last_name || '',
            email: leadData?.email || '',
            contactNumber: leadData?.phone_number || '',
            description: 'Lead generated from Facebook',
            fullAddress: leadData?.full_address || '',
            city: leadData?.city || '',
        }
        // Save the lead data object to the database
        const newLead = new LeadModel(leadDataObject)
        const savedLead = await newLead.save()
        if (!savedLead) {
            throw new Error('Failed to save lead from Facebook')
        }
        console.log('Lead saved successfully:', savedLead)
        // Return a success response

      



        // Here you can save the lead data to your database or perform any other actions
        // For demonstration, we'll just return the received data
        return {
            leadgenId: leadgen_id,
            formId: form_id,
            createdTime: created_time,
            adId: ad_id,
            message: 'Facebook lead gen webhook processed successfully'
        }
    } catch (error) {
        console.error('Error in facebookLeadGenWebhook:', error)
        return Promise.reject(error)
    }
}


exports.facebookLeadGenWebhook = async (query, body) => {
  //try {
    if (!query || !body) {
      console.log("Query or body is missing in the request");
      //throw new Error("Query and body are required");
    }
 console.log("Received Facebook lead gen data:", body);
    const { leadgen_id, form_id, created_time, ad_id } = body.entry?.[0]?.changes?.[0]?.value || {};
    console.log("Received Facebook lead gen data:", body);

    const leadDetailsRes = await axios.get(`https://graph.facebook.com/v12.0/${leadgen_id}?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`);
    const leadData = leadDetailsRes.data;

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

    const newLead = new LeadModel(leadDataObject);
    const savedLead = await newLead.save();
    if (!savedLead) {
      throw new Error("Failed to save lead from Facebook");
    }

    return {
      leadgenId: leadgen_id,
      formId: form_id,
      createdTime: created_time,
      adId: ad_id,
      message: "Facebook lead gen webhook processed successfully"
    };
  // } catch (error) {
  //   console.error("Error in facebookLeadGenWebhook:", error);
  //   return Promise.reject(error);
  // }
};


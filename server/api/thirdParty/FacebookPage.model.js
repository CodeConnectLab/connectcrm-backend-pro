// models/FacebookPage.js
const mongoose = require('mongoose');

const facebookPageSchema = new mongoose.Schema({
  pageId: { type: String, required: true, unique: true },
  pageName: { type: String, required: true },
  accessToken: { type: String, required: true },
  companyId: { type: String, required: true },
  leadSource: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('FacebookPage', facebookPageSchema);

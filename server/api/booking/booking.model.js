const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');


const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
  mode: { type: String, enum: ['cash', 'cheque', 'online'], required: true },
  chequeNumber: { type: String },
  transctionNo: { type: String },
  bankName: { type: String },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  customer: { type: String,  required: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: false },
  projectName: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductService', required: false },
  email: { type: String, required: true },
  contactName: { type: String, required: false },
  bookingDate: { type: Date, required: true },
  RM: { type: String },
  unit: { type: String },
  size: { type: String },
//   unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: false },
//   size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size', required: false },
  reference: {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tlcp: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    avp: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vp: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    as: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    agm: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gm: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vertical: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  /////// payment details of booking project
  paymentDetails: [paymentSchema],
  BSP: { type: Number, required: true,default: 0 },
  GST: { type: Number, required: true,default: 0 },
  OtherCharges: { type: Number, default: 0 },
  OtherGST: { type: Number, default: 0 },
  PCL: { type: Number, required: true,default: 0 },
  PCLGST: { type: Number, required: true,default: 0 },
  TSP: { type: Number, required: true ,default: 0},
  totalReceived: { type: Number, default: 0 },
  //////chanel partner
  GrossRevenue: { type: Number, default: 0 },
  CpRevenue: { type: Number, default: 0 },
  Discount: { type: Number, default: 0 },
  netRevenue: { type: Number, default: 0 },


  remark: { type: String },
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed'
  },
  updatedStatus:{
    type:Boolean,
    default: false
  },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'company', required: true },
}, { timestamps: true });
bookingSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Booking', bookingSchema);

const UserModel = require('../user/user.model');
const BookingModel = require('./booking.model');
// Add Booking
exports.addBooking = async (body, user, res) => {
    try {
        const {
            customer,
            leadId,
            projectName,
            email,
            contactName,
            bookingDate,
            RM,
            unit,
            size,
            reference,
            paymentDetails,
            BSP,
            GST,
            OtherCharges,
            TSP,
            totalReceived,
            OtherGST,
            PCL,
            PCLGST,
            GrossRevenue,
            CpRevenue,
            Discount,


            netRevenue,
            remark,
            bookingStatus,
        } = body;

        if (!customer || !projectName || !email || !contactName || !bookingDate || !unit || !size || !TSP) {
            return res.status(400).json({ message: 'Required fields are missing' });
        }

        const newBooking = new BookingModel({
            customer,
            leadId: leadId || null,
            projectName,
            email,
            contactName,
            bookingDate,
            RM,
            unit,
            size,
            reference,
            paymentDetails,
            BSP,
            GST,
            OtherCharges,
            TSP,
            totalReceived,
            OtherGST,
            updatedStatus:true,
            PCL,
            PCLGST,
            GrossRevenue,
            CpRevenue,
            Discount,
            netRevenue,
            remark,
            bookingStatus,
            companyId: user.companyId,
        });

        const savedBooking = await newBooking.save();
        return savedBooking;
    } catch (error) {
        throw new Error('Error adding booking: ' + error.message);
    }
}

//////// Update Booking
exports.updateBooking = async (bookingId, body, user) => {
    try {
        const { customer, projectName, email, contactName, bookingDate,
            RM, unit, size, reference, paymentDetails, BSP, GST,
            OtherCharges, TSP, totalReceived,OtherGST,PCL,PCLGST,
            GrossRevenue,CpRevenue,Discount,netRevenue, remark,
            bookingStatus } = body;
        const updatedBooking = await BookingModel.findOneAndUpdate(
            { _id: bookingId, companyId: user.companyId },
            {
                customer,
                projectName,
                email,
                contactName,
                bookingDate,
                RM,
                unit,
                size,
                reference,
                paymentDetails,
                BSP,
                GST,
                updatedStatus:true,
                OtherCharges,
                TSP,
                totalReceived,
                OtherGST,
                PCL,
                PCLGST,
                GrossRevenue,
                CpRevenue,
                Discount,
                netRevenue,
                remark,
                bookingStatus
            },
            { new: true, runValidators: true }
        );
        return updatedBooking;
    } catch (error) {
        throw new Error('Error updating booking: ' + error.message);
    }
}

// Get Booking Details
exports.getBookingDetails = async (bookingId, user) => {
    try {
        const booking = await BookingModel.findOne({ _id: bookingId, companyId: user.companyId })
            .populate('leadId', 'firstName')
            // .populate('unit', 'unitName')
            // .populate('size', 'sizeName')
            .populate('reference.employee', 'name')

            .populate('reference.SR_PORTFOLIO_MANAGER', 'name')
            .populate('reference.PORTFOLIO_MANAGER', 'name')
            .populate('reference.AS_PORTFOLIO_MANAGER', 'name')
            .populate('reference.SR_BDE', 'name')
            .populate('reference.BDE', 'name')

            .populate('reference.tlcp', 'name')
            .populate('reference.avp', 'name')
            .populate('reference.vp', 'name')
            .populate('reference.as', 'name')
            .populate('reference.agm', 'name')
            .populate('reference.gm', 'name')
            .populate('reference.vertical', 'name');
        if (!booking) {
            throw new Error('Booking not found');
        }
        return booking;
    } catch (error) {
        throw new Error('Error fetching booking details: ' + error.message);
    }
}
// Booking Service - Get Booking List
exports.getBookingList = async (queryParams, user) => {
    try {
        const {
            page, limit, sortBy, sortOrder, search, startDate, endDate, ...references
        } = queryParams;

        const query = { companyId: user.companyId ,updatedStatus:true };

        if (search) {
            query.$or = [
                { customer: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { contactName: { $regex: search, $options: 'i' } }
            ];
        }

        if (startDate && endDate) {
            query.bookingDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        for (const key in references) {
            if (references[key]) {
                query[`reference.${key}`] = references[key];
            }
        }

        const options = {
            page,
            limit,
            sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
        };
        //////////// add populate and project
        const bookings = await BookingModel.paginate(query, options);
        return bookings;
    } catch (error) {
        throw new Error('Error fetching bookings: ' + error.message);
    }
};

////  new booking
exports.getNewBooking = async (queryParams, user) => {
    try {
        const {
            page, limit, sortBy, sortOrder, search, startDate, endDate, ...references
        } = queryParams;

        const query = { companyId: user.companyId ,updatedStatus:false };

        if (search) {
            query.$or = [
                { customer: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { contactName: { $regex: search, $options: 'i' } }
            ];
        }

        if (startDate && endDate) {
            query.bookingDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        for (const key in references) {
            if (references[key]) {
                query[`reference.${key}`] = references[key];
            }
        }

        const options = {
            page,
            limit,
            sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
        };
        //////////// add populate and project
        const bookings = await BookingModel.paginate(query, options);
        return bookings;
    } catch (error) {
        throw new Error('Error fetching bookings: ' + error.message);
    }
};


///////// Get Upcoming Booking
exports.getUpcommingBooking11 = async (queryParams, user) => {
    try {
        const {
            page, limit, sortBy, sortOrder, search, startDate, endDate, ...references
        } = queryParams;

        const query = { companyId: user.companyId };

        if (search) {
            query.$or = [
                { customer: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { contactName: { $regex: search, $options: 'i' } }
            ];
        }

        if (startDate && endDate) {
            query.bookingDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        for (const key in references) {
            if (references[key]) {
                query[`reference.${key}`] = references[key];
            }
        }

        const options = {
            page,
            limit,
            sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
        };

       //////// basically ye upcoming payment ka hai
        // "paymentDetails": [
        //     {
        //         "amount": 50000,
        //         "date": "2025-05-10T00:00:00.000Z",
        //         "status": "paid",
        //         "mode": "online",
        //         "transctionNo": "645bca9f7d89a914c89f3b9e"
        //     },
        //     {
        //         "amount": 50000,
        //         "date": "2025-06-10T00:00:00.000Z",
        //         "status": "unpaid",
        //         "mode": "online",
        //         "transctionNo": "645bca9f7d89a914c89f3b9e"
        //     }
        // ], 
        //////  bacically ye paymentDetails me jo bhi date future ka hai aur unpaid hai wahi aayega aur total paid amount and unpaid amount ka bhi aayega
        query['paymentDetails'] = {
            $elemMatch: {
                date: { $gte: new Date() },
                status: 'unpaid'
            }
        }; 
    
         const bookings = await BookingModel.paginate(query, options)
            // .populate('reference.employee', 'name')
            // .populate('reference.tlcp', 'name')
            // .populate('reference.avp', 'name')
            // .populate('reference.vp', 'name')
            // .populate('reference.as', 'name')
            // .populate('reference.agm', 'name')
            // .populate('reference.gm', 'name')
            // .populate('reference.vertical', 'name')
            .projectName({
                'reference': 1,
                projectName:1,
                customer: 1,
                email: 1,
                contactName: 1,
                bookingDate: 1,
                unit: 1,
                size: 1,
                'paymentDetails': 1,
            })

         ;
        return bookings;
    } catch (error) {
        throw new Error('Error fetching bookings: ' + error.message);
    }
};

exports.getUpcomingBooking = async (queryParams, user) => {
    try {
        const {
            page = 1, // Default page
            limit = 10, // Default limit
            sortBy = 'bookingDate', // Default sort field
            sortOrder = 'asc', // Default sort order
            search,
            startDate,
            endDate,
            ...references
        } = queryParams;

        // Validate required parameters
        if (!page || !limit) {
            throw new Error('Page and limit are required for pagination.');
        }

        const query = { companyId: user.companyId };

        // Search filter
        if (search) {
            query.$or = [
                { customer: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { contactName: { $regex: search, $options: 'i' } }
            ];
        }

        // Date range filter
        if (startDate && endDate) {
            query.bookingDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        // Reference filters
        for (const key in references) {
            if (references[key]) {
                query[`reference.${key}`] = references[key];
            }
        }

        // Payment details filter for upcoming unpaid payments
        query['paymentDetails'] = {
            $elemMatch: {
                date: { $gte: new Date() },
                status: 'unpaid'
            }
        };

        // Pagination and sorting options
        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
        };

        // Fetch paginated bookings
        const bookings = await BookingModel.paginate(query, options);

        // Check if there are any bookings to populate
        if (bookings.docs.length > 0) {
            // Populate references for each booking
            bookings.docs = await BookingModel.populate(bookings.docs, [
                { path: 'reference.employee', select: 'name' },

                { path: 'reference.SR_PORTFOLIO_MANAGER', select: 'name' },
                { path: 'reference.PORTFOLIO_MANAGER', select: 'name' },
                { path: 'reference.AS_PORTFOLIO_MANAGER', select: 'name' },
                { path: 'reference.SR_BDE', select: 'name' },
                { path: 'reference.BDE', select: 'name' },

                
                { path: 'reference.tlcp', select: 'name' },
                { path: 'reference.avp', select: 'name' },
                { path: 'reference.vp', select: 'name' },
                { path: 'reference.as', select: 'name' },
                { path: 'reference.agm', select: 'name' },
                { path: 'reference.gm', select: 'name' },
                { path: 'reference.vertical', select: 'name' }
            ]);
        }

        // Select specific fields to include in the response
        bookings.docs = bookings.docs.map(booking => ({
            // reference: booking.reference,
            projectName: booking.projectName,
            customer: booking.customer,
            email: booking.email,
            contactName: booking.contactName,
            bookingDate: booking.bookingDate,
            BookingAmount: booking.TSP,
            _id: booking._id,
            //////
            DuePayement: (booking.paymentDetails.filter(payment => payment.status === 'unpaid'
                 && new Date(payment.date) >= new Date())).reduce((acc, payment) => 
                    acc + payment.amount, 0),
            nextdueamount: booking.paymentDetails.find(payment => payment.status === 'unpaid'),     

    
        }));

        // Return the paginated and populated result
        return bookings;
    } catch (error) {
        throw new Error(`Error fetching upcoming bookings: ${error.message}`);
    }
};


exports.getBookingOverview = async (user) => {
    try {
        const companyId = user?.companyId;
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        const today = new Date();

        const totalBookingsData = await BookingModel.aggregate([{ $match: { companyId } }, { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$TSP' } } }]);
        const totalBookings = totalBookingsData[0]?.count || 0;
        const totalBookingAmount = totalBookingsData[0]?.totalAmount || 0;
        const bookingsThisYearData = await BookingModel.aggregate([{ $match: { companyId, bookingDate: { $gte: startOfYear, $lte: today } } }, { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$TSP' } } }]);
        const bookingsThisYear = bookingsThisYearData[0]?.count || 0;
        const bookingsThisYearAmount = bookingsThisYearData[0]?.totalAmount || 0;
        const bookingsThisMonthData = await BookingModel.aggregate([{ $match: { companyId, bookingDate: { $gte: startOfMonth, $lte: today } } }, { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$TSP' } } }]);
        const bookingsThisMonth = bookingsThisMonthData[0]?.count || 0;
        const bookingsThisMonthAmount = bookingsThisMonthData[0]?.totalAmount || 0;
        const cancelBookingsData = await BookingModel.aggregate([{ $match: { companyId, bookingStatus: 'cancelled' } }, { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$TSP' } } }]);
        const cancelBookings = cancelBookingsData[0]?.count || 0;
        const cancelBookingAmount = cancelBookingsData[0]?.totalAmount || 0;

        const pendingAmount = await BookingModel.aggregate([
            { $match: { companyId, bookingStatus: { $ne: 'cancelled' } } },
            { $group: { _id: null, totalPending: { $sum: { $subtract: ['$TSP', '$totalReceived'] } } } }
        ]);

        const pendingThisMonth = await BookingModel.aggregate([
            { $match: { companyId, bookingDate: { $gte: startOfMonth, $lte: today }, bookingStatus: { $ne: 'cancelled' } } },
            { $group: { _id: null, monthPending: { $sum: { $subtract: ['$TSP', '$totalReceived'] } } } }
        ]);

        const getRoleData = async (role) => {
            const data = await BookingModel.aggregate([
                { $match: { companyId } },
                {
                    $group: {
                        _id: `$reference.${role}`,
                        thisMonth: { $sum: { $cond: [{ $gte: ['$bookingDate', startOfMonth] }, '$TSP', 0] } },
                        thisYear: { $sum: { $cond: [{ $gte: ['$bookingDate', startOfYear] }, '$TSP', 0] } }
                    }
                }
            ]);

            const userIds = data.map(d => d._id).filter(id => id);
            const users = await UserModel.find({ _id: { $in: userIds } }, 'name');

            return data.map(d => ({
                _id: d._id || null,
                name: d._id ? users.find(u => u._id.equals(d._id))?.name : 'Unknown',
                thisMonth: d.thisMonth,
                thisYear: d.thisYear
            })).filter(d => d._id);
        };

        const roles = ['vertical', 'as', 'vp', 'avp', 'gm', 'agm', 'tlcp', 'employee'];
        const performanceOverview = {};
        for (const role of roles) {
            performanceOverview[role] = await getRoleData(role);
        }

        return {
            total: { totalBookingAmount, totalBookings },
            thisMonth: { bookingsThisMonth, bookingsThisMonthAmount },
            thisYear: { bookingsThisYear, bookingsThisYearAmount },
            cancelBookings: { cancelBookings, cancelBookingAmount },
            pendingAmount: pendingAmount[0]?.totalPending || 0,
            pendingThisMonth: pendingThisMonth[0]?.monthPending || 0,
            performanceOverview
        };

    } catch (error) {
        console.error('Error fetching booking overview:', error);
        throw new Error('Server error');
    }
}



const LeadModel=require('../lead/lead.model');
const LeadStatusModel=require('../leadStatus/leadStatus.model')
const userRoles = require('../../config/constants/userRoles');
const UserModel =require('../user/user.model')
exports.getCalendarData=async({},user)=>{
    try {
        const Calenderdata = await LeadModel.find(
            {
                assignedAgent: user._id,
                companyId: user.companyId,
                addCalender: true
            },
            'firstName assignedAgent comment followUpDate' // Select only these fields
        ).populate({
            path: 'assignedAgent',
            select: '_id name',
            model: 'User'
        });
              return Calenderdata;
    } catch (error) {
        console.error('Lead update error:', error);
        throw error;
    }
    
}

exports.getDashboardMetrics = async ({ leadAccessFilter },params, user) => {
    try {
      const { startDate, endDate } = params

      // Convert dates to UTC
      const start = startDate ? new Date(startDate) : new Date()
      start.setUTCHours(0, 0, 0, 0)

      const end = endDate ? new Date(endDate) : new Date()
      end.setUTCHours(23, 59, 59, 999)
      

      const topMetrics = await topMetricss(leadAccessFilter,start,end,user)
    
      const activityMetrics= await activityMetricss(leadAccessFilter,start,end,user)
      
      const performanceMetrics= await calculateSalesMetrics(user)

      const leadSourceMetricss=await leadSourceMetricsss(leadAccessFilter,start,end,user)

      const paymentOverview=await getPaymentsOverview(user)

      const employeePerformance = await getEmployeePerformance(start,end, user);
      

      return {
        topMetrics,
        activityMetrics,
        performanceMetrics,
        leadSourceMetricss,
        paymentOverview,
        employeePerformance,
        totalEmployees: employeePerformance.length,
        androidVersion : "v1.0.1",
        iosversion : "v1.0.0",
        mobileApkDownlodeLink:'https://crm.page.codeconnect.in/app-download',
      }
    } catch (error) {
        console.error('Dashboard Metrics Error:', error);
        throw error;
    }
};


const topMetricss = async (leadAccessFilter,start, end, user) => {
  // Base query for current period
  let baseQuery = {
    companyId: user.companyId,
    ...leadAccessFilter,    // createdAt: { $gte: start, $lte: end }
  }
  // Previous period query
  let previousQuery = {
    companyId: user.companyId,
    ...leadAccessFilter,    // createdAt: { $gte: start, $lte: end }
    createdAt: {
      // $gte: registerdate,
      $lt: start
    }
  }
  //  // Add user filter if not Super Admin
  //  if (user.role !== userRoles.SUPER_ADMIN) {
  //   baseQuery.assignedAgent = user._id;
  //   previousQuery.assignedAgent = user._id;
  // }

  // Add user filter based on role
  // if (user.role !== userRoles.SUPER_ADMIN) {
  //   if (user.role === userRoles.TEAM_ADMIN) {
  //     // For Team Leader - show their own data AND their team members' data
  //     const query = {
  //       $or: [
  //         { assignedAgent: user._id }, // TL's own assignments
  //         {
  //           assignedAgent: {
  //             $in: await UserModel.distinct('_id', { assignedTL: user._id })
  //           }
  //         } // Team members' assignments
  //       ]
  //     }
  //     baseQuery = { ...baseQuery, ...query }
  //     previousQuery = { ...previousQuery, ...query }
  //   } else {
  //     // For regular users - only show their own data
  //     baseQuery.assignedAgent = user._id
  //     previousQuery.assignedAgent = user._id
  //   }
  // }

  // Get followup status IDs
  const followupStatusIds = await LeadStatusModel.find({
    companyId: user.companyId,
    showFollowUp: true
  }).distinct('_id')

  // Get imported status IDs
  const importedStatusIds = await LeadStatusModel.find({
    companyId: user.companyId,
    showImported: true
  }).distinct('_id')

  // Get OutSourced status IDs
  let OutSourcedStatusIds = await LeadStatusModel.find({
    companyId: user.companyId,
    showOutSourced: true,
  }).distinct('_id')
  // add one Id also for OutSourcedStatusIds
  // OutSourcedStatusIds.push(new mongoose.Types.ObjectId('67b9761e239b25980850a707'));
  // console.log('OutSourcedStatusIds', OutSourcedStatusIds);
  // Fetch all metrics in parallel
  const [
    currentLeads,
    previousLeads,
    followupLeads,
    previousFollowupLeads,
    importedLeads,
    previousImportedLeads,
    outsourcedLeads,
    previousOutsourcedLeads
  ] = await Promise.all([
    // Total Leads
    LeadModel.countDocuments(baseQuery),
    LeadModel.countDocuments(previousQuery),

    // Follow Up Leads
    LeadModel.countDocuments({
      ...baseQuery,
      leadUpdated:true,
      leadStatus: { $in: followupStatusIds }
    }),
    LeadModel.countDocuments({
      ...previousQuery,
      leadUpdated:true,
      leadStatus: { $in: followupStatusIds }
    }),

    // Imported Leads
    LeadModel.countDocuments({ ...baseQuery, leadAddType:
       'Import', leadUpdated:false, leadStatus: { $in: importedStatusIds } }),
    LeadModel.countDocuments({ ...previousQuery, leadAddType:
       'Import', leadUpdated:false, leadStatus: { $in: importedStatusIds } }),

    // Outsourced Leads
    LeadModel.countDocuments({ ...baseQuery, 
      leadAddType: 'ThirdParty', 
      leadUpdated:false,
      leadSource : new mongoose.Types.ObjectId('67b9761e239b25980850a707')
      //  leadStatus: { $in: OutSourcedStatusIds } 
      }),
    LeadModel.countDocuments({
      ...previousQuery,
      leadAddType: 'ThirdParty',
      leadUpdated:false,
      leadSource : new mongoose.Types.ObjectId('67b9761e239b25980850a707')
    //  leadStatus: { $in: OutSourcedStatusIds }
    })
  ])

  // Calculate percentage changes
  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return 0
    return (((current - previous) / previous) * 100).toFixed(2)
  }

  // Format numbers with K for thousands
  const formatNumber = (num) => {
    return num >= 1000 ? (num / 1000).toFixed(3) + 'K' : num
  }

  return (data = [
    {
      value: formatNumber(outsourcedLeads),
      change: calculatePercentageChange(
        outsourcedLeads,
        previousOutsourcedLeads
      ),
      title: 'New Leads',
      color: '#0804ff',
      webroute: 'https://crm.codeconnect.in/leads/outsourced-leads',
      deeplink: 'allOutsourceLeads'
    },
    {
      value: formatNumber(followupLeads),
      change: calculatePercentageChange(followupLeads, previousFollowupLeads),
      title: 'All Followup Leads',
      color: '#049bff',
      webroute: 'https://crm.codeconnect.in/leads/followup',
      deeplink: 'allFollowupLeads'
    },
    {
      value: formatNumber(importedLeads),
      change: calculatePercentageChange(importedLeads, previousImportedLeads),
      title: 'All Imported Leads',
      color: '#ff8e04',
      webroute: 'https://crm.codeconnect.in/leads/imported-leads',
      deeplink: 'allImportedLeads'
    },
    {
      value: formatNumber(currentLeads),
      change: calculatePercentageChange(currentLeads, previousLeads),
      title: 'All Leads',
      color: '#2AFF04',
      webroute: 'https://crm.codeconnect.in/leads/all',
      deeplink: 'alllead'
    },
  ])
}

const activityMetricss = async (leadAccessFilter,start, end, user) => {
  // Get all lead statuses with showDashboard: true
  const dashboardStatusList = await LeadStatusModel.find({
    companyId: user.companyId,
    showDashboard: true
  }).lean()

  // Set up dates
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const endOfToday = new Date(today)
  endOfToday.setUTCHours(23, 59, 59, 999)

  const endOfTomorrow = new Date(tomorrow)
  endOfTomorrow.setUTCHours(23, 59, 59, 999)

  // Create base query based on user role
  let baseQuery = {
    companyId: user.companyId,
    ...leadAccessFilter,
  }

  // Add user filter based on role
  // if (user.role !== userRoles.SUPER_ADMIN) {
  //   if (user.role === userRoles.TEAM_ADMIN) {
  //     // For Team Leader - show their own data AND their team members' data
  //     const query = {
  //       $or: [
  //         { assignedAgent: user._id }, // TL's own assignments
  //         {
  //           assignedAgent: {
  //             $in: await UserModel.distinct('_id', { assignedTL: user._id })
  //           }
  //         } // Team members' assignments
  //       ]
  //     }
  //     baseQuery = { ...baseQuery, ...query }
  //    // previousQuery = { ...previousQuery, ...query }
  //   } else {
  //     // For regular users - only show their own data
  //     baseQuery.assignedAgent = user._id
  //    // previousQuery.assignedAgent = user._id
  //   }
  // }

  // Create aggregation pipeline for each status
  const statusPromises = dashboardStatusList.map(async (status) => {
    // Count for today
    const todayCount = await LeadModel.countDocuments({
      ...baseQuery,
      leadStatus: status._id,
     // followUpDate: { $gte: today, $lte: endOfToday }
    })

    // Count for tomorrow
    // const tomorrowCount = await LeadModel.countDocuments({
    //   ...baseQuery,
    //   leadStatus: status._id,
    //   followUpDate: { $gte: tomorrow, $lte: endOfTomorrow }
    // })

    return {
      title: status.name,
      color: status.color || '#000000',
      today: todayCount,
      tomorrow: '',
      leadStatus: status._id,
      route: 'https://crm.codeconnect.in/leadspage'
    }
  })

  const activityMetrics = await Promise.all(statusPromises)
  return activityMetrics
}

const calculateSalesMetrics = async (user) => {
  try {
    // Get current date info with UTC consideration
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    // Set date ranges with UTC
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1))
    const endOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999))
    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1))
    const endOfMonth = new Date(
      Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    )

    // Base query with company filter
    let baseQuery = { companyId: user.companyId }
    // Add user filter based on role
    if (user.role !== userRoles.SUPER_ADMIN) {
      if (user.role === userRoles.TEAM_ADMIN) {
        // For Team Leader - show their own data AND their team members' data
        const query = {
          $or: [
            { assignedAgent: user._id }, // TL's own assignments
            {
              assignedAgent: {
                $in: await UserModel.distinct('_id', { assignedTL: user._id })
              }
            } // Team members' assignments
          ]
        }
        baseQuery = { ...baseQuery, ...query }
        //previousQuery = { ...previousQuery, ...query }
      } else {
        // For regular users - only show their own data
        baseQuery.assignedAgent = user._id
        //previousQuery.assignedAgent = user._id
      }
    }

    // Fetch status IDs in parallel
    const [wonStatusIds, lossStatusIds] = await Promise.all([
      LeadStatusModel.find({
        companyId: user.companyId,
        wonStatus: true
      }).distinct('_id'),
      LeadStatusModel.find({
        companyId: user.companyId,
        lossStatus: true
      }).distinct('_id')
    ])

    // Run all aggregations in parallel for better performance
    const [
      yearlyWonResult,
      monthlyWonResult,
      monthlyLostResult,
      previousYearResult
    ] = await Promise.all([
      // Yearly won amount (current year)
      LeadModel.aggregate([
        {
          $match: {
            ...baseQuery,
            leadStatus: { $in: wonStatusIds },
            updatedAt: { $gte: startOfYear, $lte: endOfYear }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $ifNull: ['$leadWonAmount', 0] } },
            count: { $sum: 1 }
          }
        }
      ]),

      // Monthly won amount (current month)
      LeadModel.aggregate([
        {
          $match: {
            ...baseQuery,
            leadStatus: { $in: wonStatusIds },
            updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $ifNull: ['$leadWonAmount', 0] } },
            count: { $sum: 1 }
          }
        }
      ]),

      // Monthly lost amount (current month)
      LeadModel.aggregate([
        {
          $match: {
            ...baseQuery,
            leadStatus: { $in: lossStatusIds },
            updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $ifNull: ['$leadCost', 0] } },
            count: { $sum: 1 }
          }
        }
      ]),

      // Previous year's data for percentage calculation
      LeadModel.aggregate([
        {
          $match: {
            ...baseQuery,
            leadStatus: { $in: wonStatusIds },
            updatedAt: {
              $gte: new Date(Date.UTC(currentYear - 1, 0, 1)),
              $lte: new Date(Date.UTC(currentYear - 1, 11, 31, 23, 59, 59, 999))
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $ifNull: ['$leadWonAmount', 0] } }
          }
        }
      ])
    ])

    // Calculate percentages based on previous year's data
    const previousYearAmount = previousYearResult[0]?.totalAmount || 0
    const currentYearAmount = yearlyWonResult[0]?.totalAmount || 0
    const yearlyPercentage = previousYearAmount
      ? Math.min(
          Math.round((currentYearAmount / previousYearAmount) * 100),
          100
        )
      : 0

    // Calculate monthly percentage based on yearly average target
    const monthlyTarget = currentYearAmount
      ? Math.round(currentYearAmount / 12)
      : 100000
    const monthlyPercentage = monthlyTarget
      ? Math.min(
          Math.round(
            ((monthlyWonResult[0]?.totalAmount || 0) / monthlyTarget) * 100
          ),
          100
        )
      : 0

    // Calculate miss opportunity percentage
    const totalOpportunities =
      (monthlyWonResult[0]?.count || 0) + (monthlyLostResult[0]?.count || 0)
    const missPercentage = totalOpportunities
      ? Math.round(
          ((monthlyLostResult[0]?.count || 0) / totalOpportunities) * 100
        )
      : 0

    return {
      yearlySales: {
        amount: yearlyWonResult[0]?.totalAmount || 0,
        count: yearlyWonResult[0]?.count || 0,
        title: 'Yearly Sales',
        color: '#24b224',
        percentage: yearlyPercentage,
        currency: '₹'
      },
      monthlySales: {
        amount: monthlyWonResult[0]?.totalAmount || 0,
        count: monthlyWonResult[0]?.count || 0,
        title: 'Monthly Sales',
        color: '#0461ff',
        percentage: monthlyPercentage,
        currency: '₹'
      },
      missOpportunity: {
        amount: monthlyLostResult[0]?.totalAmount || 0,
        count: monthlyLostResult[0]?.count || 0,
        title: 'Miss Opportunity',
        color: '#ff8504',
        percentage: missPercentage,
        currency: '₹'
      }
    }
  } catch (error) {
    console.error('Error calculating sales metrics:', error)
    throw new Error('Failed to calculate sales metrics')
  }
}
const leadSourceMetricsss = async (leadAccessFilter,start, end, user) => {
    const match = {
        companyId: user.companyId,
        ...leadAccessFilter,
    };

    // if (user.role !== userRoles.SUPER_ADMIN) {
    //     match.assignedAgent = user._id;
    // }

    const leadSourceStats = await LeadModel.aggregate([
        { $match: match },
        {
            $lookup: {
                from: 'leadsources',
                localField: 'leadSource',
                foreignField: '_id',
                as: 'sourceInfo'
            }
        },
        { $unwind: '$sourceInfo' },
        {
            $group: {
                _id: {
                    sourceId: '$sourceInfo._id',
                    sourceName: '$sourceInfo.name',
                    color: '$sourceInfo.color'
                },
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                name: '$_id.sourceName',
                color: '$_id.color',
                value: '$count'
            }
        }
    ]);

    const totalLeads = leadSourceStats.reduce((sum, source) => sum + source.value, 0);
    const predefinedColors = [
        '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF',
        '#FFC300', '#FF5733', '#DAF7A6', '#C70039', '#900C3F',
        '#581845', '#2ECC71', '#3498DB', '#9B59B6', '#F1C40F',
        '#E74C3C', '#1ABC9C', '#2C3E50', '#16A085', '#8E44AD',
        '#D35400', '#27AE60', '#2980B9', '#34495E', '#E67E22',
        '#F39C12', '#BDC3C7', '#7F8C8D', '#95A5A6', '#ECF0F1'
    ];

    return {
        total: totalLeads,
        sources: leadSourceStats.map((source, index) => ({
            name: source.name,
            value: source.value,
            color: source.color || predefinedColors[index % predefinedColors.length],
            percentage: totalLeads ? ((source.value / totalLeads) * 100).toFixed(2) : "0.00"
        }))
    };
};
  const getPaymentsOverview = async (user) => {
    try {
      // Get current date info
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth()

      // Get won and loss status IDs
      const [wonStatusIds, lossStatusIds] = await Promise.all([
        LeadStatusModel.find({
          companyId: user.companyId,
          wonStatus: true
        }).distinct('_id'),
        LeadStatusModel.find({
          companyId: user.companyId,
          lossStatus: true
        }).distinct('_id')
      ])

      // Generate last 12 months
      const months = []
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1)
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
        const endOfMonth = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        )

        months.push({
          month: date.toLocaleString('default', { month: 'short' }),
          startDate: startOfMonth,
          endDate: endOfMonth
        })
      }

      // Base query for filtering by company and user role
      let baseQuery = { companyId: user.companyId }
      // Add user filter based on role
      if (user.role !== userRoles.SUPER_ADMIN) {
        if (user.role === userRoles.TEAM_ADMIN) {
          // For Team Leader - show their own data AND their team members' data
          const query = {
            $or: [
              { assignedAgent: user._id }, // TL's own assignments
              {
                assignedAgent: {
                  $in: await UserModel.distinct('_id', { assignedTL: user._id })
                }
              } // Team members' assignments
            ]
          }
          baseQuery = { ...baseQuery, ...query }
         // previousQuery = { ...previousQuery, ...query }
        } else {
          // For regular users - only show their own data
          baseQuery.assignedAgent = user._id
          //previousQuery.assignedAgent = user._id
        }
      }

      // Aggregate data for each month
      const monthlyData = await Promise.all(
        months.map(async ({ month, startDate, endDate }) => {
          // Query for won and lost leads in parallel
          const [wonLeads, lostLeads] = await Promise.all([
            // Get won leads
            LeadModel.aggregate([
              {
                $match: {
                  ...baseQuery,
                  leadStatus: { $in: wonStatusIds },
                  updatedAt: { $gte: startDate, $lte: endDate }
                }
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: { $ifNull: ['$leadWonAmount', 0] } },
                  count: { $sum: 1 }
                }
              }
            ]),

            // Get lost leads
            LeadModel.aggregate([
              {
                $match: {
                  ...baseQuery,
                  leadStatus: { $in: lossStatusIds },
                  updatedAt: { $gte: startDate, $lte: endDate }
                }
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: { $ifNull: ['$leadCost', 0] } },
                  count: { $sum: 1 }
                }
              }
            ])
          ])

          return {
            month,
            received: wonLeads[0]?.count || 0,
            loss: lostLeads[0]?.count || 0,
            receivedAmount: wonLeads[0]?.total || 0,
            lossAmount: lostLeads[0]?.total || 0
          }
        })
      )

      // Calculate totals
      const totals = monthlyData.reduce(
        (acc, curr) => {
          acc.totalReceived += curr.receivedAmount
          acc.totalLoss += curr.lossAmount
          return acc
        },
        { totalReceived: 0, totalLoss: 0 }
      )

      // Get current month data for percentage calculations
      const currentMonthData = monthlyData[monthlyData.length - 1]
      const previousMonthData = monthlyData[monthlyData.length - 2] || {
        received: 0,
        loss: 0
      }

      // Calculate percentage changes
      const receivedPercentChange = previousMonthData.received
        ? ((currentMonthData.received - previousMonthData.received) /
            previousMonthData.received) *
          100
        : 0
      const lossPercentChange = previousMonthData.loss
        ? ((currentMonthData.loss - previousMonthData.loss) /
            previousMonthData.loss) *
          100
        : 0

      return {
        chartData: monthlyData,
        summary: {
          receivedLeads: totals.totalReceived,
          lostLeads: totals.totalLoss
        }
      }
    } catch (error) {
      console.error('Error in getPaymentsOverview:', error)
      throw new Error('Failed to fetch overview data')
    }
  }

 
  const getEmployeePerformance1 = async (start, end, user) => {
    try {
      // Base query
      let baseQuery = {
        companyId: user.companyId
      }

      
      // Add user filter based on role
      // if (user.role !== userRoles.SUPER_ADMIN) {
      //   if (user.role === userRoles.TEAM_ADMIN) {
      //     // For Team Leader - show their own data AND their team members' data
      //     const query = {
      //       $or: [
      //         { assignedAgent: user._id }, // TL's own assignments
      //         {
      //           assignedAgent: {
      //             $in: await UserModel.distinct('_id', { assignedTL: user._id })
      //           }
      //         } // Team members' assignments
      //       ]
      //     }
      //     baseQuery = { ...baseQuery, ...query }
      //    // previousQuery = { ...previousQuery, ...query }
      //   } else {
      //     // For regular users - only show their own data
      //     baseQuery.assignedAgent = user._id
      //    // previousQuery.assignedAgent = user._id
      //   }
      // }

      // if (user.role !== userRoles.SUPER_ADMIN) {
      //   const assignedFields = [
      //     "assignedAD",
      //     "assignedAGM",
      //     "assignedGM",
      //     "assignedAVP",
      //     "assignedVP",
      //     "assignedVertical",
      //     "assignedSRPORTFOLIOMANAGER",
      //     "assignedPORTFOLIOMANAGER",
      //     "assignedASPORTFOLIOMANAGER",
      //     "assignedSRBDE",
      //     "assignedBDE",
      //     "assignedTL",
      //     "assignedAgent"
      //   ]

      //   baseQuery.$or = assignedFields.map(field => ({ [field]: user._id }))
      // }

//       if (user.role !== userRoles.SUPER_ADMIN) {
//   const assignedFields = [
//     "assignedAD",
//     "assignedAGM",
//     "assignedGM",
//     "assignedAVP",
//     "assignedVP",
//     "assignedVertical",
//     "assignedSRPORTFOLIOMANAGER",
//     "assignedPORTFOLIOMANAGER",
//     "assignedASPORTFOLIOMANAGER",
//     "assignedSRBDE",
//     "assignedBDE",
//     "assignedTL",
//     "assignedAgent"
//   ];

//   let orConditions = assignedFields.map(field => ({ [field]: user._id }));

//   // Define which field represents the "directly assigned users" for this role
//   const roleToFieldMap = {
//     TEAM_ADMIN: "assignedTL",
//     USER: "assignedAgent",
//     BDE: "assignedBDE",
//     SRBDE: "assignedSRBDE",
//     ASPORTFOLIOMANAGER: "assignedASPORTFOLIOMANAGER",
//     PORTFOLIOMANAGER: "assignedPORTFOLIOMANAGER",
//     SRPORTFOLIOMANAGER: "assignedSRPORTFOLIOMANAGER",
//     VERTICAL: "assignedVertical",
//     VP: "assignedVP",
//     AVP: "assignedAVP",
//     GM: "assignedGM",
//     AGM: "assignedAGM",
//     AD: "assignedAD"
//   };

//   const assignedFieldForRole = roleToFieldMap[user.role];

//   if (assignedFieldForRole) {
//     // Find all users assigned directly under this user
//     const subordinateIds = await UserModel.distinct("_id", { [assignedFieldForRole]: user._id });

//     if (subordinateIds.length > 0) {
//       orConditions.push({ assignedAgent: { $in: subordinateIds } });
//     }
//   }

//   baseQuery = { ...baseQuery, $or: orConditions };
// }


// console.log("Base Query:", JSON.stringify(baseQuery, null, 2))



      // Get won and loss status IDs
      
      
      const [wonStatusIds, lossStatusIds] = await Promise.all([
        LeadStatusModel.find({
          companyId: user.companyId,
          wonStatus: true
        }).distinct('_id'),
        LeadStatusModel.find({
          companyId: user.companyId,
          lossStatus: true
        }).distinct('_id')
      ])

      // Get employee performance metrics
      const performanceMetrics = await LeadModel.aggregate([
        {
          $match: baseQuery
        },
        {
          $group: {
            _id: '$assignedAgent',
            leads: { $push: '$$ROOT' },
            assignedLeads: { $sum: 1 },
            firstNames: { $addToSet: '$firstName' },
            lastNames: { $addToSet: '$lastName' },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $in: ['$leadStatus', wonStatusIds] },
                  { $ifNull: ['$leadWonAmount', 0] },
                  0
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $unwind: '$userInfo'
        },
        {
          $addFields: {
            closedLeads: {
              $size: {
                $filter: {
                  input: '$leads',
                  as: 'lead',
                  cond: {
                    $or: [
                      { $in: ['$$lead.leadStatus', wonStatusIds] },
                      { $in: ['$$lead.leadStatus', lossStatusIds] }
                    ]
                  }
                }
              }
            },
            openLeads: {
              $size: {
                $filter: {
                  input: '$leads',
                  as: 'lead',
                  cond: {
                    $and: [
                      { $not: [{ $in: ['$$lead.leadStatus', wonStatusIds] }] },
                      { $not: [{ $in: ['$$lead.leadStatus', lossStatusIds] }] }
                    ]
                  }
                }
              }
            },
            failedLeads: {
              $size: {
                $filter: {
                  input: '$leads',
                  as: 'lead',
                  cond: { $in: ['$$lead.leadStatus', lossStatusIds] }
                }
              }
            },
            wonLeads: {
              $size: {
                $filter: {
                  input: '$leads',
                  as: 'lead',
                  cond: { $in: ['$$lead.leadStatus', wonStatusIds] }
                }
              }
            },
            conversion: {
              $cond: [
                { $eq: ['$assignedLeads', 0] },
                0,
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $size: {
                            $filter: {
                              input: '$leads',
                              as: 'lead',
                              cond: { $in: ['$$lead.leadStatus', wonStatusIds] }
                            }
                          }
                        },
                        '$assignedLeads'
                      ]
                    },
                    100
                  ]
                }
              ]
            }
          }
        },
        {
          $project: {
            _id: 0,
            agent: '$userInfo.name',
            // leadFirstName: { $arrayElemAt: ['$firstNames', 0] },
            //  leadLastName: { $arrayElemAt: ['$lastNames', 0] },
            assignedLeads: 1,
            closed: '$closedLeads',
            open: '$openLeads',
            failed: '$failedLeads',
            totalRevenue: 1,
            conversion: {
              $toString: {
                $round: ['$conversion', 2]
              }
            },
            isOnline: { $ifNull: ['$userInfo.isOnline', false] }
            // email: '$userInfo.email',
            // phone: '$userInfo.phone'
          }
        },
        {
          $sort: { assignedLeads: -1 }
        }
      ])

      // Format the revenue and conversion after aggregation
      const formattedMetrics = performanceMetrics.map((metric) => ({
        ...metric,
        revenue: `${metric.totalRevenue}`,
        conversion: `${metric.conversion}%`
      }))

      return formattedMetrics
    } catch (error) {
      console.error('Error in getEmployeePerformance:', error)
      throw error
    }
  }

  const getEmployeePerformance2 = async (start, end, user) => {
  try {
    // Base query for company
    let baseQuery = { companyId: user.companyId };

    // SUPER_ADMIN sees everything
    if (user.role !== 'Super Admin') {
      const assignedFields = [
        "assignedAD",
        "assignedAGM",
        "assignedGM",
        "assignedAVP",
        "assignedVP",
        "assignedVertical",
        "assignedSRPORTFOLIOMANAGER",
        "assignedPORTFOLIOMANAGER",
        "assignedASPORTFOLIOMANAGER",
        "assignedSRBDE",
        "assignedBDE",
        "assignedTL",
        "assignedAgent"
      ];

      // Map roles to the field that assigns subordinates
      const roleToFieldMap = {
        'Team Leader': 'assignedTL',
        'Employee': 'assignedAgent',
        'BDE': 'assignedBDE',
        'Sr. BDE': 'assignedSRBDE',
        'As. Portfolio Manager': 'assignedASPORTFOLIOMANAGER',
        'Portfolio Manager': 'assignedPORTFOLIOMANAGER',
        'Sr. Portfolio Manager': 'assignedSRPORTFOLIOMANAGER',
        'Vertical': 'assignedVertical',
        'VP': 'assignedVP',
        'AVP': 'assignedAVP',
        'GM': 'assignedGM',
        'AGM': 'assignedAGM',
        'AD': 'assignedAD'
      };

      const getAllSubordinateIds = async (userId) => {
        // Recursively fetch all subordinate IDs
        const subIds = [];
        const directIds = await UserModel.distinct('_id', {
          $or: assignedFields.map(field => ({ [field]: userId }))
        });

        for (const id of directIds) {
          subIds.push(id);
          const deeperIds = await getAllSubordinateIds(id);
          subIds.push(...deeperIds);
        }

        return subIds;
      };

      // Fetch subordinates recursively
      const subordinateIds = await getAllSubordinateIds(user._id);

      // User sees own leads + all subordinate leads
      baseQuery.$or = [
        { assignedAgent: user._id },
        { assignedAgent: { $in: subordinateIds } }
      ];
    }

    // Filter by date range if provided
    // if (start && end) {
    //   baseQuery.createdAt = { $gte: new Date(start), $lte: new Date(end) };
    // }

    // Get won and loss status IDs
    const [wonStatusIds, lossStatusIds] = await Promise.all([
      LeadStatusModel.find({ companyId: user.companyId, wonStatus: true }).distinct('_id'),
      LeadStatusModel.find({ companyId: user.companyId, lossStatus: true }).distinct('_id')
    ]);

    // Aggregate employee performance
    const performanceMetrics = await LeadModel.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$assignedAgent',
          leads: { $push: '$$ROOT' },
          assignedLeads: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $addFields: {
          closedLeads: {
            $size: {
              $filter: {
                input: '$leads',
                as: 'lead',
                cond: {
                  $or: [
                    { $in: ['$$lead.leadStatus', wonStatusIds] },
                    { $in: ['$$lead.leadStatus', lossStatusIds] }
                  ]
                }
              }
            }
          },
          openLeads: {
            $size: {
              $filter: {
                input: '$leads',
                as: 'lead',
                cond: {
                  $and: [
                    { $not: [{ $in: ['$$lead.leadStatus', wonStatusIds] }] },
                    { $not: [{ $in: ['$$lead.leadStatus', lossStatusIds] }] }
                  ]
                }
              }
            }
          },
          failedLeads: {
            $size: {
              $filter: {
                input: '$leads',
                as: 'lead',
                cond: { $in: ['$$lead.leadStatus', lossStatusIds] }
              }
            }
          },
          wonLeads: {
            $size: {
              $filter: {
                input: '$leads',
                as: 'lead',
                cond: { $in: ['$$lead.leadStatus', wonStatusIds] }
              }
            }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ['$leadStatus', wonStatusIds] },
                { $ifNull: ['$leadWonAmount', 0] },
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          conversion: {
            $cond: [
              { $eq: ['$assignedLeads', 0] },
              0,
              {
                $multiply: [
                  { $divide: ['$wonLeads', '$assignedLeads'] },
                  100
                ]
              }
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          agent: '$userInfo.name',
          assignedLeads: 1,
          closed: '$closedLeads',
          open: '$openLeads',
          failed: '$failedLeads',
          totalRevenue: 1,
          conversion: { $toString: { $round: ['$conversion', 2] } },
          isOnline: { $ifNull: ['$userInfo.isOnline', false] }
        }
      },
      { $sort: { assignedLeads: -1 } }
    ]);

    // Format revenue and conversion
    return performanceMetrics.map(metric => ({
      ...metric,
      revenue: `${metric.totalRevenue}`,
      conversion: `${metric.conversion}%`
    }));

  } catch (error) {
    console.error('Error in getEmployeePerformance:', error);
    throw error;
  }
};
const mongoose = require('mongoose');
const getEmployeePerformance = async (start, end, user) => {
  try {
    // Step 1: Get all subordinate IDs including self
    const roleToFieldMap = {
      'Team Leader': 'assignedTL',
      'Employee': 'assignedAgent',
      'BDE': 'assignedBDE',
      'Sr. BDE': 'assignedSRBDE',
      'As. Portfolio Manager': 'assignedASPORTFOLIOMANAGER',
      'Portfolio Manager': 'assignedPORTFOLIOMANAGER',
      'Sr. Portfolio Manager': 'assignedSRPORTFOLIOMANAGER',
      'Vertical': 'assignedVertical',
      'VP': 'assignedVP',
      'AVP': 'assignedAVP',
      'GM': 'assignedGM',
      'AGM': 'assignedAGM',
      'AD': 'assignedAD'
    };

    const getSubordinateIds = async (userId, role) => {
      const field = roleToFieldMap[role];
      if (!field) return [];

      const directSubs = await UserModel.find({ [field]: userId }, '_id role').lean();
      const ids = directSubs.map(u => u._id.toString());

      const allSubs = [...ids];
      for (const sub of directSubs) {
        const deeperSubs = await getSubordinateIds(sub._id, sub.role);
        allSubs.push(...deeperSubs);
      }
      return allSubs;
    };

    let userIds = [];
    if (user.role === 'Super Admin') {
      const allUsers = await UserModel.find({ companyId: user.companyId }, '_id').lean();
      userIds = allUsers.map(u => u._id.toString());
    } else {
      const subordinateIds = await getSubordinateIds(user._id, user.role);
      userIds = [user._id.toString(), ...subordinateIds];
    }

    // Step 2: Get won/loss status IDs
    const [wonStatusIds, lossStatusIds] = await Promise.all([
      LeadStatusModel.find({ companyId: user.companyId, wonStatus: true }).distinct('_id'),
      LeadStatusModel.find({ companyId: user.companyId, lossStatus: true }).distinct('_id')
    ]);

    // Step 3: Aggregate leads per user using LEFT JOIN approach
    const performanceMetrics = await UserModel.aggregate([
      { $match: { _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) } } },
      {
        $lookup: {
          from: 'leads',
          localField: '_id',
          foreignField: 'assignedAgent',
          as: 'leads'
        }
      },
      {
        $addFields: {
          assignedLeads: { $size: '$leads' },
          closedLeads: {
            $size: {
              $filter: {
                input: '$leads',
                as: 'lead',
                cond: { $or: [
                  { $in: ['$$lead.leadStatus', wonStatusIds] },
                  { $in: ['$$lead.leadStatus', lossStatusIds] }
                ]}
              }
            }
          },
          openLeads: {
            $size: {
              $filter: {
                input: '$leads',
                as: 'lead',
                cond: { $and: [
                  { $not: [{ $in: ['$$lead.leadStatus', wonStatusIds] }] },
                  { $not: [{ $in: ['$$lead.leadStatus', lossStatusIds] }] }
                ]}
              }
            }
          },
          failedLeads: {
            $size: {
              $filter: {
                input: '$leads',
                as: 'lead',
                cond: { $in: ['$$lead.leadStatus', lossStatusIds] }
              }
            }
          },
          wonLeads: {
            $size: {
              $filter: {
                input: '$leads',
                as: 'lead',
                cond: { $in: ['$$lead.leadStatus', wonStatusIds] }
              }
            }
          },
          totalRevenue: {
            $sum: {
              $map: {
                input: '$leads',
                as: 'lead',
                in: {
                  $cond: [
                    { $in: ['$$lead.leadStatus', wonStatusIds] },
                    { $ifNull: ['$$lead.leadWonAmount', 0] },
                    0
                  ]
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          conversion: {
            $cond: [
              { $eq: ['$assignedLeads', 0] },
              0,
              { $multiply: [{ $divide: ['$wonLeads', '$assignedLeads'] }, 100] }
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          agent: '$name',
          assignedLeads: 1,
          closed: '$closedLeads',
          open: '$openLeads',
          failed: '$failedLeads',
          totalRevenue: 1,
          conversion: { $toString: { $round: ['$conversion', 2] } },
          isOnline: { $ifNull: ['$isOnline', false] }
        }
      },
      { $sort: { assignedLeads: -1 } }
    ]);

    // Format revenue and conversion
    return performanceMetrics.map(metric => ({
      ...metric,
      revenue: `${metric.totalRevenue}`,
      conversion: `${metric.conversion}%`
    }));

  } catch (error) {
    console.error('Error in getEmployeePerformance:', error);
    throw error;
  }
};



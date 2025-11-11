const User = require('../api/user/user.model');
const {userRoles} = require('../config/constants');
const { SUPERVISOR_FIELD_MAP } = require('../config/constants/roleHierarchyMap');

const getAllChildUserIds1 = async (userId, role) => {
  const field = SUPERVISOR_FIELD_MAP[role];
  console.log("userId", userId, "role", role, "field", field)
  if (!field) return [];

  const directReports = await User.find({ [field]: userId }, '_id role');
  let allUserIds = directReports.map(u => u._id);

  for (const user of directReports) {
    const subUserIds = await getAllChildUserIds(user._id, user.role);
    allUserIds = allUserIds.concat(subUserIds);
  }

  return allUserIds;
};


const getAllChildUserIds = async (userId, role) => {
    if (!userId) {
      console.log("userId is undefined!");
      return [];
    }
  
    const field = SUPERVISOR_FIELD_MAP[role];
   // console.log("Checking for userId:", userId, "role:", role, "field:", field);
  
    let allUserIds = [userId]; // ✅ 
  
    if (!field) {
      // If no further hierarchy (like Employee), return only self
      return allUserIds;
    }
  
    const directReports = await User.find({ [field]: userId }, '_id role');
  
    for (const user of directReports) {
      const subUserIds = await getAllChildUserIds(user._id, user.role);
      allUserIds = allUserIds.concat(subUserIds);
    }
  
    return allUserIds;
  };

const leadAccessMiddleware = async (req, res, next) => {
  try {
    const { _id, role } = req.user;

    if (role === userRoles.SUPER_ADMIN) {
      req.leadAccessFilter = {}; // Super Admin can see all leads
    } else if (role === userRoles.USER) {
      req.leadAccessFilter = { assignedAgent: _id };
    } else {
      const agentIds = await getAllChildUserIds(_id, role);
      agentIds.push(_id); // Include own leads
      req.leadAccessFilter = { assignedAgent: { $in: agentIds } };
    }

    next();
  } catch (error) {
    console.error('Error in leadAccessMiddleware:', error);
    res.status(500).json({ message: 'Internal server error in access middleware' });
  }
};

module.exports = leadAccessMiddleware;

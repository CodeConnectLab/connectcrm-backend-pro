// utils/getAllSubordinateUserIds.js

const User = require('../api/user/user.model');

const roleToField = {
  "VERTICAL": "assignedVertical",
  "VP": "assignedVP",
  "AVP": "assignedAVP",
  "GM": "assignedGM",
  "AGM": "assignedAGM",
  "AS": "assignedAS",
  "TEAM_ADMIN": "assignedTL"
};


const userRoles = {
    SUPER_ADMIN: "Super Admin",
    VERTICAL: "Vertical",
    AS: "AS",
    VP: "VP",
    AVP: "AVP",
    GM: "GM",
    AGM: "AGM",
    TEAM_ADMIN: "Team Leader",
    USER: "Employee"
  };
  
  const roleHierarchy = {
    "Super Admin": [],
    "Vertical": ["AS", "VP", "AVP", "GM", "AGM", "Team Leader", "Employee"],
    "AS": ["VP", "AVP", "GM", "AGM", "Team Leader", "Employee"],
    "VP": ["AVP", "GM", "AGM", "Team Leader", "Employee"],
    "AVP": ["GM", "AGM", "Team Leader", "Employee"],
    "GM": ["AGM", "Team Leader", "Employee"],
    "AGM": ["Team Leader", "Employee"],
    "Team Leader": ["Employee"],
    "Employee": []
  };

/**
 * Recursive function to get all child user IDs under a given user
 */
const getAllSubordinateUserIds = async (userId, role) => {
  const field = roleToField[role];
  if (!field) return [];
   console.log("userId", userId, "role", role, "field", field)
  const directReports = await User.find({ [field]: userId }, '_id role');
  let allUserIds = directReports.map(u => u._id);

  for (const report of directReports) {
    const subUserIds = await getAllSubordinateUserIds(report._id, report.role);
    allUserIds = allUserIds.concat(subUserIds);
  }
   console.log("allUserIds", allUserIds)
  return allUserIds;
};

module.exports = {
  getAllSubordinateUserIds
};

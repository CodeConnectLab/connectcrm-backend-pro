const USER_ROLES = require("./userRoles");
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


module.exports = {
    USER_ROLES,
    userRoles
}
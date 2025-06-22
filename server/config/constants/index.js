const USER_ROLES = require("./userRoles");
const userRoles = {
    SUPER_ADMIN: "Super Admin",
    VERTICAL: "Vertical",
    AD: "AD",
    VP: "VP",
    AVP: "AVP",
    GM: "GM",
    AGM: "AGM",
    TEAM_ADMIN: "Team Leader",
    SR_PORTFOLIO_MANAGER: "Sr. Portfolio Manager",
    PORTFOLIO_MANAGER: "Portfolio Manager",
    AS_PORTFOLIO_MANAGER: "As. Portfolio Manager",
    SR_BDE: "Sr. BDE",
    BDE: "BDE",
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
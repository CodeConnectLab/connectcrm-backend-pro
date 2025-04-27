// module.exports = {
//     SUPER_ADMIN: "Super Admin",
//     USER: "Employee",
//     // SUPPORT: "Support",
//     TEAM_ADMIN: "Team Leader"
// }

module.exports = {
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


  

  const roleToField = {
    "VERTICAL": "assignedVertical",
    "VP": "assignedVP",
    "AVP": "assignedAVP",
    "GM": "assignedGM",
    "AGM": "assignedAGM",
    "AS": "assignedAS",
    "TEAM_ADMIN": "assignedTL"
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
  
  


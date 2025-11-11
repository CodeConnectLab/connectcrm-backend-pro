const userRoles = require('./userRoles');

const ROLE_SEQUENCE = [
  userRoles.SUPER_ADMIN,
  userRoles.VERTICAL,
  userRoles.AD,
  userRoles.VP,
  userRoles.AVP,
  userRoles.GM,
  userRoles.AGM,
  userRoles.TEAM_ADMIN,
  userRoles.SR_PORTFOLIO_MANAGER,
  userRoles.PORTFOLIO_MANAGER,
  userRoles.AS_PORTFOLIO_MANAGER,
  userRoles.SR_BDE,
  userRoles.BDE,
  userRoles.USER
];

const SUPERVISOR_FIELD_MAP = {
  [userRoles.VERTICAL]: 'assignedVertical',
  [userRoles.AD]: 'assignedAD',
  [userRoles.VP]: 'assignedVP',
  [userRoles.AVP]: 'assignedAVP',
  [userRoles.GM]: 'assignedGM',
  [userRoles.AGM]: 'assignedAGM',
  [userRoles.TEAM_ADMIN]: 'assignedTL',
  [userRoles.SR_PORTFOLIO_MANAGER]: 'assignedSRPORTFOLIOMANAGER',
  [userRoles.PORTFOLIO_MANAGER]: 'assignedPORTFOLIOMANAGER',
  [userRoles.AS_PORTFOLIO_MANAGER]: 'assignedASPORTFOLIOMANAGER',
  [userRoles.SR_BDE]: 'assignedSRBDE',
  [userRoles.BDE]: 'assignedBDE'
};

const ROLE_INDEX_LOOKUP = ROLE_SEQUENCE.reduce((acc, role, index) => {
  acc[role] = index;
  return acc;
}, {});

const getDescendantRoles = (role) => {
  const startIndex = ROLE_INDEX_LOOKUP[role];
  if (startIndex === undefined) {
    return [];
  }
  return ROLE_SEQUENCE.slice(startIndex + 1);
};

const getSupervisorRole = (role) => {
  const roleIndex = ROLE_INDEX_LOOKUP[role];
  if (!roleIndex || roleIndex < 1) {
    return null;
  }
  return ROLE_SEQUENCE[roleIndex - 1] || null;
};

const getSupervisorFieldForRole = (role) => {
  const supervisorRole = getSupervisorRole(role);
  if (!supervisorRole) {
    return null;
  }
  return SUPERVISOR_FIELD_MAP[supervisorRole] || null;
};

module.exports = {
  ROLE_SEQUENCE,
  SUPERVISOR_FIELD_MAP,
  getDescendantRoles,
  getSupervisorRole,
  getSupervisorFieldForRole
};


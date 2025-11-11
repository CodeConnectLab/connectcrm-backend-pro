const mongoose = require('mongoose');
const User = require('../api/user/user.model');
const Lead = require('../api/lead/lead.model');
const LeadStatus = require('../api/leadStatus/leadStatus.model');
const userRoles = require('../config/constants/userRoles');
const {
  ROLE_SEQUENCE,
  SUPERVISOR_FIELD_MAP,
  getSupervisorFieldForRole
} = require('../config/constants/roleHierarchyMap');

const sanitizeCompanyScope = (query, companyId) => {
  if (!companyId) {
    return query;
  }

  return {
    ...query,
    companyId
  };
};

const mergeCounts = (baseCounts, additionalCounts) => {
  const merged = { ...baseCounts };
  Object.entries(additionalCounts).forEach(([role, value]) => {
    merged[role] = (merged[role] || 0) + value;
  });
  return merged;
};

const formatCounts = (counts) => {
  const orderedRoles = ROLE_SEQUENCE
    .filter((role) => counts[role])
    .map((role) => ({
      role,
      count: counts[role]
    }));

  const remainingRoles = Object.keys(counts)
    .filter((role) => !ROLE_SEQUENCE.includes(role))
    .sort()
    .map((role) => ({
      role,
      count: counts[role]
    }));

  return [...orderedRoles, ...remainingRoles];
};

const ZERO_LEAD_STATS = {
  totalAssigned: 0,
  followUp: 0,
  closed: 0,
  lost: 0
};

const toObjectId = (value) => {
  if (!value) {
    return undefined;
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return undefined;
};

const getLeadStatsForUser = (leadStatsMap, userId) => {
  if (!leadStatsMap) {
    return { ...ZERO_LEAD_STATS };
  }

  const key = userId?.toString();
  if (!key) {
    return { ...ZERO_LEAD_STATS };
  }

  const stats = leadStatsMap[key];
  return stats ? { ...stats } : { ...ZERO_LEAD_STATS };
};

const buildLeadStatusBuckets = async (companyId) => {
  if (!companyId) {
    return {
      wonStatusIds: [],
      lossStatusIds: [],
      followUpStatusIds: []
    };
  }

  const query = {
    companyId,
    deleted: { $ne: true }
  };

  const statuses = await LeadStatus.find(
    query,
    '_id wonStatus lossStatus showFollowUp'
  ).lean();

  const wonStatusIds = [];
  const lossStatusIds = [];
  const followUpStatusIds = [];

  statuses.forEach((status) => {
    const id = status._id;
    if (status.wonStatus) {
      wonStatusIds.push(id);
    }
    if (status.lossStatus) {
      lossStatusIds.push(id);
    }
    if (status.showFollowUp && !status.wonStatus && !status.lossStatus) {
      followUpStatusIds.push(id);
    }
  });

  return {
    wonStatusIds,
    lossStatusIds,
    followUpStatusIds
  };
};

const buildLeadStatsMap = async ({ companyId, userIds }) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return null;
  }

  const uniqueIds = Array.from(
    new Set(
      userIds
        .map((id) => id?.toString?.())
        .filter((id) => typeof id === 'string')
    )
  );

  if (uniqueIds.length === 0) {
    return null;
  }

  const objectIds = uniqueIds
    .map((id) => toObjectId(id))
    .filter(Boolean);

  if (objectIds.length === 0) {
    return null;
  }

  const matchStage = {
    assignedAgent: { $in: objectIds }
  };

  if (companyId) {
    matchStage.companyId = toObjectId(companyId);
  }

  const { wonStatusIds, lossStatusIds, followUpStatusIds } =
    await buildLeadStatusBuckets(matchStage.companyId);

  const aggregation = await Lead.aggregate([
    {
      $match: matchStage
    },
    {
      $group: {
        _id: '$assignedAgent',
        totalAssigned: { $sum: 1 },
        followUp: {
          $sum: followUpStatusIds.length
            ? {
                $cond: [{ $in: ['$leadStatus', followUpStatusIds] }, 1, 0]
              }
            : 0
        },
        closed: {
          $sum: wonStatusIds.length
            ? { $cond: [{ $in: ['$leadStatus', wonStatusIds] }, 1, 0] }
            : 0
        },
        lost: {
          $sum: lossStatusIds.length
            ? { $cond: [{ $in: ['$leadStatus', lossStatusIds] }, 1, 0] }
            : 0
        }
      }
    }
  ]);

  const leadStatsMap = Object.create(null);

  aggregation.forEach((doc) => {
    leadStatsMap[doc._id.toString()] = {
      totalAssigned: doc.totalAssigned || 0,
      followUp: doc.followUp || 0,
      closed: doc.closed || 0,
      lost: doc.lost || 0
    };
  });

  return leadStatsMap;
};

const buildSubordinateTree = async (
  userId,
  role,
  companyId,
  visited,
  leadStatsMap
) => {
  const field = SUPERVISOR_FIELD_MAP[role];

  if (!field) {
    return {
      nodes: [],
      total: 0,
      counts: {}
    };
  }

  const query = sanitizeCompanyScope(
    {
      [field]: userId,
      deleted: { $ne: true }
    },
    companyId
  );

  const directReports = await User.find(query, '_id name role').lean();

  const nodes = [];
  let total = 0;
  let counts = {};

  for (const report of directReports) {
    const reportId = report._id?.toString?.();

    if (!reportId || visited.has(reportId)) {
      continue;
    }

    visited.add(reportId);

    const childData = await buildSubordinateTree(
      report._id,
      report.role,
      companyId,
      visited,
      leadStatsMap
    );

    nodes.push({
      _id: report._id,
      name: report.name,
      role: report.role,
      totalSubordinates: childData.total,
      children: childData.nodes,
      leadStats: getLeadStatsForUser(leadStatsMap, report._id)
    });

    total += 1 + childData.total;
    counts = mergeCounts(counts, {
      [report.role]: 1
    });
    counts = mergeCounts(counts, childData.counts);
  }

  return {
    nodes,
    total,
    counts
  };
};

const collectSubordinateIds = async (userId, role, companyId, visited) => {
  const field = SUPERVISOR_FIELD_MAP[role];

  if (!field) {
    return [];
  }

  const query = sanitizeCompanyScope(
    {
      [field]: userId,
      deleted: { $ne: true }
    },
    companyId
  );

  const directReports = await User.find(query, '_id role').lean();

  const subordinateIds = [];

  for (const report of directReports) {
    const reportId = report._id.toString();

    if (visited.has(reportId)) {
      continue;
    }

    visited.add(reportId);
    subordinateIds.push(report._id);

    const nestedIds = await collectSubordinateIds(
      report._id,
      report.role,
      companyId,
      visited
    );

    subordinateIds.push(...nestedIds);
  }

  return subordinateIds;
};

const getAllSubordinateUserIds = async (userId, role, companyId) => {
  const visited = new Set([userId.toString()]);
  return collectSubordinateIds(userId, role, companyId, visited);
};

const getSubordinateHierarchy = async ({ userId, role, companyId }) => {
  const rootIdString = userId?.toString();

  if (!role) {
    return {
      totalSubordinates: 0,
      summaryByRole: [],
      hierarchy: [],
      leadStats: { ...ZERO_LEAD_STATS }
    };
  }

  if (role === userRoles.SUPER_ADMIN) {
    const projection = {
      _id: 1,
      name: 1,
      role: 1
    };

    Array.from(new Set(Object.values(SUPERVISOR_FIELD_MAP))).forEach(
      (field) => {
        if (field) {
          projection[field] = 1;
        }
      }
    );

    const baseQuery = sanitizeCompanyScope(
      { deleted: { $ne: true } },
      companyId
    );

    const candidates = await User.find(baseQuery, projection).lean();
    const allUserIds = candidates
      .map((candidate) => candidate?._id)
      .filter(Boolean);

    const leadStatsMap = await buildLeadStatsMap({
      companyId,
      userIds: [userId, ...allUserIds]
    });

    const visited = new Set([rootIdString]);

    const nodes = [];
    let total = 0;
    let counts = {};

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }
      const candidateId = candidate._id;
      const candidateIdString = candidateId?.toString?.();

      if (!candidateId || candidateIdString === rootIdString) {
        continue;
      }

      const supervisorField = getSupervisorFieldForRole(candidate.role);
      if (supervisorField && candidate[supervisorField]) {
        continue;
      }

      if (visited.has(candidateIdString)) {
        continue;
      }

      visited.add(candidateIdString);

      const childTree = await buildSubordinateTree(
        candidateId,
        candidate.role,
        companyId,
        visited,
        leadStatsMap
      );

      nodes.push({
        _id: candidateId,
        name: candidate.name,
        role: candidate.role,
        totalSubordinates: childTree.total,
        children: childTree.nodes,
        leadStats: getLeadStatsForUser(leadStatsMap, candidateId)
      });

      total += 1 + childTree.total;
      counts = mergeCounts(counts, { [candidate.role]: 1 });
      counts = mergeCounts(counts, childTree.counts);
    }

    return {
      totalSubordinates: total,
      summaryByRole: formatCounts(counts),
      hierarchy: nodes,
      leadStats: getLeadStatsForUser(leadStatsMap, userId)
    };
  }

  const subordinateIds = await collectSubordinateIds(
    userId,
    role,
    companyId,
    new Set([rootIdString])
  );

  const leadStatsMap = await buildLeadStatsMap({
    companyId,
    userIds: [userId, ...subordinateIds]
  });

  const visited = new Set([rootIdString]);
  const { nodes, total, counts } = await buildSubordinateTree(
    userId,
    role,
    companyId,
    visited,
    leadStatsMap
  );

  return {
    totalSubordinates: total,
    summaryByRole: formatCounts(counts),
    hierarchy: nodes,
    leadStats: getLeadStatsForUser(leadStatsMap, userId)
  };
};

module.exports = {
  getAllSubordinateUserIds,
  getSubordinateHierarchy
};

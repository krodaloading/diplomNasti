const roles = {
  admin: {
    canViewAll: true,
    canManageUsers: true,
    canManageProjects: true,
    canAssignTasks: true,
    canComment: true
  },
  product_manager: {
    canViewAll: true,
    canManageUsers: true,
    canManageProjects: true,
    canAssignTasks: true,
    canComment: true
  },
  division_manager: {
    canViewDivision: true,
    canAssignDivisionTasks: true,
    canManageDivisionUsers: true,
    canComment: true
  },
  executor: {
    canViewDivision: true,
    canComment: true
  }
};

module.exports = roles;

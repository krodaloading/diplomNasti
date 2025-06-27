const roles = require('./roles');

function checkPermission(permission) {
  return function (req, res, next) {
    const user = global.users.find(u => u.id === req.session.userId);
    if (!user) {
      return res.status(401).send("Не авторизован");
    }
    let roleName = null;
    switch(user.role) {
      case '1': roleName = 'product_manager'; break;
      case '2': roleName = 'division_manager'; break;
      case '3': roleName = 'executor'; break;
      default: roleName = 'executor';
    }

    const rolePermissions = roles[roleName];

    if (!rolePermissions || !rolePermissions[permission]) {
      return res.status(403).send("Доступ запрещён");
    }
    next();
  };
}

module.exports = { checkPermission };

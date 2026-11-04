const { ForbiddenError } = require('../utils/errors');

module.exports = (...allowedRoles) => {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return next(new ForbiddenError('Acceso denegado'));
    }
    if (!roles.includes(req.user.rol)) {
      return next(new ForbiddenError(`El rol '${req.user.rol}' no tiene permisos para esta acción`));
    }
    next();
  };
};

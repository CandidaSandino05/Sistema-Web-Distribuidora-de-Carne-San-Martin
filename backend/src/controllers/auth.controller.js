const authService = require('../services/auth.service');

class AuthController {
  async login(req, res, next) {
    try {
      const { usuario, username, correo, password } = req.body;
      const identifier = usuario || username || correo;
      const result = await authService.login(identifier, password);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: req.user
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();

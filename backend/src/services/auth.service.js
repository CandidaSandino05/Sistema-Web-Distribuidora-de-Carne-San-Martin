const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { UnauthorizedError, ValidationError } = require('../utils/errors');

class AuthService {
  async login(identifier, password) {
    if (!identifier || !password) {
      throw new ValidationError('Usuario y contraseña son requeridos');
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();

    const { rows } = await db.query(
      'SELECT * FROM usuarios WHERE usuario = $1',
      [cleanIdentifier]
    );

    if (rows.length === 0) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const user = rows[0];

    if (!user.activo) {
      throw new UnauthorizedError('La cuenta de usuario está inactiva');
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const payload = {
      id: user.id,
      nombre: user.nombre,
      usuario: user.usuario,
      correo: user.correo,
      rol: user.rol
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return {
      token,
      user: payload
    };
  }

  async hashPassword(plainTextPassword) {
    const saltRounds = 10;
    return bcrypt.hash(plainTextPassword, saltRounds);
  }
}

module.exports = new AuthService();

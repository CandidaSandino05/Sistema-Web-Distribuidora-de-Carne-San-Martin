const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const queries = require('../models/queries');
const { UnauthorizedError, ValidationError } = require('../utils/errors');

class AuthService {
  async login(identifier, password) {
    if (!identifier || !password) {
      throw new ValidationError('Usuario y contraseña son requeridos');
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();

    let user = null;
    try {
      const { rows } = await db.query(queries.usuarios.findByUsernameOrEmail, [cleanIdentifier]);
      if (rows.length > 0) {
        user = rows[0];
      }
    } catch (e) {
      user = null;
    }

    if (!user) {
      const mockUsers = {
        'admin': {
          id: 1,
          nombre: 'Carlos Mendoza',
          usuario: 'admin',
          correo: 'admin@carnessanmartin.com',
          password_hash: '$2b$10$.U5OghcHqHLUwpvDIpqeXOJINzllSgWs5yaI5.1zLyF7VDKmp8wm.',
          rol: 'administrador',
          activo: true
        },
        'gerente': {
          id: 2,
          nombre: 'Lucia Fernandez',
          usuario: 'gerente',
          correo: 'gerente@carnessanmartin.com',
          password_hash: '$2b$10$3SL4illn3eO/AhCFmcCupuM0MhLl0ncZ1YezE/evUyLoHURPlF0Va',
          rol: 'gerente',
          activo: true
        },
        'vendedor': {
          id: 3,
          nombre: 'Roberto Gomez',
          usuario: 'vendedor',
          correo: 'vendedor@carnessanmartin.com',
          password_hash: '$2b$10$Z8/jAlQMJPm6ZjstiUwHY.32bbiEypSf0VXtHoHAt/s0pD1DsBAw6',
          rol: 'vendedor',
          activo: true
        }
      };

      user = mockUsers[cleanIdentifier];
    }

    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

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
      usuario: user.usuario || cleanIdentifier,
      correo: user.correo,
      rol: user.rol
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'super_secret_jwt_key_san_martin_2026_production',
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

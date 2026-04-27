const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { ROLES } = require('../utils/constants');
const { AppError } = require('../middlewares/errorHandler');

const BCRYPT_ROUNDS = 10;

const signToken = (user) =>
  jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );

const register = async ({ name, email, password, role }) => {
  const normalisedEmail = String(email).trim().toLowerCase();

  if (!Object.values(ROLES).includes(role)) {
    throw new AppError(
      `Invalid role. Allowed: ${Object.values(ROLES).join(', ')}`,
      400,
    );
  }

  // Pre-check for a clearer 409. The DB UNIQUE index is the actual guarantee.
  const existing = await userModel.findByEmail(normalisedEmail);
  if (existing) {
    throw new AppError('A user with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await userModel.create({
    name: name.trim(),
    email: normalisedEmail,
    passwordHash,
    role,
  });

  return user;
};

const login = async ({ email, password }) => {
  const normalisedEmail = String(email).trim().toLowerCase();
  const user = await userModel.findByEmail(normalisedEmail);

  // Same generic 401 for unknown email vs wrong password — prevents account enumeration.
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user);

  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...safeUser } = user;
  return { user: safeUser, token };
};

const getProfile = async (userId) => {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

module.exports = { register, login, getProfile };

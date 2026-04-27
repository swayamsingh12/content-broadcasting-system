const authService = require('../services/authService');
const { success } = require('../utils/responseHelper');
const { asyncHandler } = require('../middlewares/errorHandler');

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  return success(res, 201, 'User registered successfully', user);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return success(res, 200, 'Login successful', result);
});

module.exports = { register, login };

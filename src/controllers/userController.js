const authService = require('../services/authService');
const { success } = require('../utils/responseHelper');
const { asyncHandler } = require('../middlewares/errorHandler');

const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  return success(res, 200, 'Profile fetched', user);
});

module.exports = { getProfile };

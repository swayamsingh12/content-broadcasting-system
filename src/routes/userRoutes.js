const express = require('express');
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/profile', authenticate, userController.getProfile);

module.exports = router;

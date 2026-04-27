const express = require('express');
const authController = require('../controllers/authController');
const { validate } = require('../middlewares/validateMiddleware');
const { registerBody, loginBody } = require('../utils/schemas');

const router = express.Router();

router.post('/register', validate(registerBody, 'body'), authController.register);
router.post('/login', validate(loginBody, 'body'), authController.login);

module.exports = router;

const express = require('express');
const broadcastController = require('../controllers/broadcastController');
const { validate } = require('../middlewares/validateMiddleware');
const { liveParams, liveQuery } = require('../utils/schemas');

const router = express.Router();

router.get(
  '/live/:teacherId',
  validate(liveParams, 'params'),
  validate(liveQuery, 'query'),
  broadcastController.live,
);

module.exports = router;

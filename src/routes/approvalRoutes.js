const express = require('express');
const approvalController = require('../controllers/approvalController');
const { authenticate } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validateMiddleware');
const {
  approvalListQuery,
  approvalIdParams,
  rejectBody,
} = require('../utils/schemas');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(authenticate, requireRole(ROLES.PRINCIPAL));

router.get(
  '/all',
  validate(approvalListQuery, 'query'),
  approvalController.listAll,
);

router.get(
  '/pending',
  validate(approvalListQuery, 'query'),
  approvalController.listPending,
);

router.put(
  '/:id/approve',
  validate(approvalIdParams, 'params'),
  approvalController.approve,
);

router.put(
  '/:id/reject',
  validate(approvalIdParams, 'params'),
  validate(rejectBody, 'body'),
  approvalController.reject,
);

module.exports = router;

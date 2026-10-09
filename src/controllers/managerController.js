const User = require('../models/User');
const SystemLog = require('../models/SystemLog');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, ACCOUNT_STATUS } = require('../config/constants');

/**
 * Get all kitchen staff members (Phase 4: Manager Permissions)
 * GET /api/manager/staff
 */
const getStaff = asyncHandler(async (req, res) => {
  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const allUsers = InMemoryStore.getUsers ? InMemoryStore.getUsers() : [];
    const staffList = allUsers.filter((u) => u.role === ROLES.STAFF);
    return res.json({
      message: 'Kitchen staff retrieved',
      count: staffList.length,
      data: staffList.map((u) => ({
        _id: u._id,
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        account_status: u.account_status,
        phone: u.phone,
        createdAt: u.createdAt
      }))
    });
  }

  const staff = await User.find({ role: ROLES.STAFF })
    .select('-password')
    .sort({ createdAt: -1 });

  return res.json({
    message: 'Kitchen staff retrieved',
    count: staff.length,
    data: staff
  });
});

/**
 * Add a new kitchen staff member (Phase 4: Manager Permissions)
 * POST /api/manager/staff
 */
const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, phone, account_status } = req.body;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const existing = InMemoryStore.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        message: 'A user with this email already exists',
        details: { email }
      });
    }

    const newStaff = await InMemoryStore.addUser({
      name,
      email,
      password,
      role: ROLES.STAFF,
      phone: phone || ''
    });

    InMemoryStore.addLog({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'STAFF_CREATED',
      details: { staff_id: newStaff._id, email: newStaff.email }
    });

    return res.status(201).json({
      message: 'Kitchen staff member created successfully',
      data: {
        _id: newStaff._id,
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        account_status: newStaff.account_status,
        phone: newStaff.phone
      }
    });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({
      message: 'A user with this email already exists',
      details: { email }
    });
  }

  // Strictly enforce Kitchen Staff role
  const staff = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: ROLES.STAFF,
    account_status: account_status || ACCOUNT_STATUS.ACTIVE,
    phone: phone || ''
  });

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'STAFF_CREATED',
    details: { staff_id: staff._id, email: staff.email, name: staff.name }
  });

  return res.status(201).json({
    message: 'Kitchen staff member created successfully',
    data: staff
  });
});

/**
 * Edit a kitchen staff member (Phase 4: Manager Permissions)
 * PATCH /api/manager/staff/:id
 */
const updateStaff = asyncHandler(async (req, res) => {
  const staffId = req.params.id;
  const { name, phone, account_status, password } = req.body;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const user = InMemoryStore.findUserById ? InMemoryStore.findUserById(staffId) : null;
    if (!user) {
      return res.status(404).json({
        message: 'Staff member not found',
        details: { staffId }
      });
    }

    if (user.role !== ROLES.STAFF) {
      return res.status(403).json({
        message: 'Permission denied: Managers can only manage Kitchen Staff accounts',
        details: { targetUserRole: user.role }
      });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (account_status) user.account_status = account_status;
    if (password) {
      const bcrypt = require('bcryptjs');
      user.passwordHash = bcrypt.hashSync(password, 10);
    }

    InMemoryStore.addLog({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'STAFF_UPDATED',
      details: { staff_id: staffId, name: user.name, account_status: user.account_status }
    });

    return res.json({
      message: 'Kitchen staff updated successfully',
      data: user
    });
  }

  const staff = await User.findById(staffId);
  if (!staff) {
    return res.status(404).json({
      message: 'Staff member not found',
      details: { staffId }
    });
  }

  // Strict role check: Manager can ONLY edit Kitchen Staff
  if (staff.role !== ROLES.STAFF) {
    return res.status(403).json({
      message: 'Permission denied: Managers can only manage Kitchen Staff accounts',
      details: { targetUserRole: staff.role }
    });
  }

  if (name) staff.name = name;
  if (phone !== undefined) staff.phone = phone;
  if (account_status) staff.account_status = account_status;
  if (password) staff.password = password;

  await staff.save();

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'STAFF_UPDATED',
    details: { staff_id: staff._id, name: staff.name, account_status: staff.account_status }
  });

  return res.json({
    message: 'Kitchen staff updated successfully',
    data: staff
  });
});

/**
 * Delete / Remove a kitchen staff member (Phase 4: Manager Permissions)
 * DELETE /api/manager/staff/:id
 */
const deleteStaff = asyncHandler(async (req, res) => {
  const staffId = req.params.id;

  if (require('mongoose').connection.readyState !== 1) {
    const InMemoryStore = require('../services/inMemoryStore');
    const user = InMemoryStore.findUserById ? InMemoryStore.findUserById(staffId) : null;
    if (!user) {
      return res.status(404).json({
        message: 'Staff member not found',
        details: { staffId }
      });
    }

    if (user.role !== ROLES.STAFF) {
      return res.status(403).json({
        message: 'Permission denied: Managers can only manage Kitchen Staff accounts',
        details: { targetUserRole: user.role }
      });
    }

    user.account_status = ACCOUNT_STATUS.INACTIVE;

    InMemoryStore.addLog({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'STAFF_DELETED',
      details: { staff_id: staffId, email: user.email }
    });

    return res.json({
      message: 'Kitchen staff member removed successfully',
      data: user
    });
  }

  const staff = await User.findById(staffId);
  if (!staff) {
    return res.status(404).json({
      message: 'Staff member not found',
      details: { staffId }
    });
  }

  if (staff.role !== ROLES.STAFF) {
    return res.status(403).json({
      message: 'Permission denied: Managers can only manage Kitchen Staff accounts',
      details: { targetUserRole: staff.role }
    });
  }

  await User.findByIdAndDelete(staffId);

  await SystemLog.create({
    user_id: req.user._id,
    user_name: req.user.name,
    role: req.user.role,
    action: 'STAFF_DELETED',
    details: { staff_id: staffId, email: staff.email, name: staff.name }
  });

  return res.json({
    message: 'Kitchen staff member removed successfully',
    data: { _id: staffId, name: staff.name }
  });
});

module.exports = {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff
};

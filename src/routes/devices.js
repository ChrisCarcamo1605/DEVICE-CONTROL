const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const db = require('../config/db');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { branch_id, category_id, status } = req.query;
  const user = req.user;

  const query = db('devices')
    .leftJoin('device_categories', 'devices.category_id', 'device_categories.id')
    .leftJoin('branches', 'devices.branch_id', 'branches.id')
    .leftJoin('devices as parent', 'devices.parent_device_id', 'parent.id')
    .select(
      'devices.*',
      'device_categories.name as category_name',
      'branches.name as branch_name',
      'parent.name as parent_name'
    )
    .orderBy('devices.name');

  if (user.role === 'branch_manager') query.where('devices.branch_id', user.branch_id);
  if (branch_id) query.where('devices.branch_id', branch_id);
  if (category_id) query.where('devices.category_id', category_id);
  if (status) query.where('devices.status', status);

  const [devices, branches, categories] = await Promise.all([
    query,
    db('branches').orderBy('name'),
    db('device_categories').orderBy('name'),
  ]);

  res.render('devices/index', {
    title: 'Dispositivos', path: '/devices',
    devices, branches, categories,
    filters: { branch_id, category_id, status },
  });
});

router.get('/new', requireRole('it_manager'), async (req, res) => {
  const [branches, categories, parentDevices] = await Promise.all([
    db('branches').orderBy('name'),
    db('device_categories').orderBy('name'),
    db('devices').whereNull('parent_device_id').orderBy('name').select('id', 'name', 'serial_number', 'branch_id'),
  ]);
  res.render('devices/form', {
    title: 'Nuevo dispositivo', path: '/devices',
    device: null, branches, categories, parentDevices, errors: [],
  });
});

router.post('/', requireRole('it_manager'), async (req, res) => {
  const { name, serial_number, category_id, parent_device_id, value, purchase_date, invoice_number, status } = req.body;
  let { branch_id } = req.body;
  const errors = [];
  if (!name?.trim()) errors.push('El nombre es requerido.');

  // Resolve branch from parent when provided
  let parent = null;
  if (parent_device_id) {
    parent = await db('devices').where({ id: parent_device_id }).select('branch_id').first();
    if (parent) branch_id = parent.branch_id;
  }

  if (!branch_id) errors.push('La sucursal es requerida.');

  if (errors.length) {
    const [branches, categories, parentDevices] = await Promise.all([
      db('branches').orderBy('name'),
      db('device_categories').orderBy('name'),
      db('devices').whereNull('parent_device_id').orderBy('name').select('id', 'name', 'serial_number', 'branch_id'),
    ]);
    return res.render('devices/form', {
      title: 'Nuevo dispositivo', path: '/devices',
      device: req.body, branches, categories, parentDevices, errors,
    });
  }

  await db('devices').insert({
    name: name.trim(),
    serial_number: serial_number?.trim() || null,
    category_id: category_id || null,
    branch_id,
    parent_device_id: parent_device_id || null,
    assigned_by: req.user.id,
    value: value || null,
    purchase_date: purchase_date || null,
    invoice_number: invoice_number?.trim() || null,
    status: status || 'active',
  });

  res.redirect('/devices');
});

router.get('/:id', async (req, res) => {
  const device = await db('devices')
    .leftJoin('device_categories', 'devices.category_id', 'device_categories.id')
    .leftJoin('branches', 'devices.branch_id', 'branches.id')
    .leftJoin('profiles', 'devices.assigned_by', 'profiles.id')
    .select('devices.*', 'device_categories.name as category_name', 'branches.name as branch_name', 'profiles.full_name as assigned_by_name')
    .where('devices.id', req.params.id)
    .first();

  if (!device) return res.redirect('/devices');

  const [components, history] = await Promise.all([
    db('devices')
      .leftJoin('device_categories', 'devices.category_id', 'device_categories.id')
      .select('devices.*', 'device_categories.name as category_name')
      .where('devices.parent_device_id', device.id),
    db('maintenance_history')
      .leftJoin('profiles', 'maintenance_history.it_manager_id', 'profiles.id')
      .leftJoin('tickets', 'maintenance_history.ticket_id', 'tickets.id')
      .select('maintenance_history.*', 'profiles.full_name as manager_name', 'tickets.id as ticket_ref')
      .where('maintenance_history.device_id', device.id)
      .orderBy('maintenance_history.created_at', 'desc'),
  ]);

  let parent = null;
  if (device.parent_device_id) {
    parent = await db('devices').where({ id: device.parent_device_id }).select('id', 'name').first();
  }

  res.render('devices/show', {
    title: device.name, path: '/devices',
    device, components, history, parent,
  });
});

router.get('/:id/edit', requireRole('it_manager'), async (req, res) => {
  const device = await db('devices').where({ id: req.params.id }).first();
  if (!device) return res.redirect('/devices');

  const [branches, categories, parentDevices] = await Promise.all([
    db('branches').orderBy('name'),
    db('device_categories').orderBy('name'),
    db('devices').where('id', '!=', req.params.id).whereNull('parent_device_id').orderBy('name').select('id', 'name', 'serial_number', 'branch_id'),
  ]);

  res.render('devices/form', {
    title: 'Editar dispositivo', path: '/devices',
    device, branches, categories, parentDevices, errors: [],
  });
});

router.post('/:id', requireRole('it_manager'), async (req, res) => {
  const { name, serial_number, category_id, parent_device_id, value, purchase_date, invoice_number, status } = req.body;
  let { branch_id } = req.body;
  const errors = [];
  if (!name?.trim()) errors.push('El nombre es requerido.');

  // Resolve branch from parent when provided
  if (parent_device_id) {
    const parent = await db('devices').where({ id: parent_device_id }).select('branch_id').first();
    if (parent) branch_id = parent.branch_id;
  }

  if (!branch_id) errors.push('La sucursal es requerida.');

  if (errors.length) {
    const [branches, categories, parentDevices] = await Promise.all([
      db('branches').orderBy('name'),
      db('device_categories').orderBy('name'),
      db('devices').where('id', '!=', req.params.id).whereNull('parent_device_id').orderBy('name').select('id', 'name', 'serial_number', 'branch_id'),
    ]);
    return res.render('devices/form', {
      title: 'Editar dispositivo', path: '/devices',
      device: { id: req.params.id, ...req.body }, branches, categories, parentDevices, errors,
    });
  }

  await db('devices').where({ id: req.params.id }).update({
    name: name.trim(),
    serial_number: serial_number?.trim() || null,
    category_id: category_id || null,
    branch_id,
    parent_device_id: parent_device_id || null,
    value: value || null,
    purchase_date: purchase_date || null,
    invoice_number: invoice_number?.trim() || null,
    status: status || 'active',
    updated_at: new Date(),
  });

  res.redirect(`/devices/${req.params.id}`);
});

router.post('/:id/delete', requireRole('it_manager'), async (req, res) => {
  try {
    await db('devices').where({ id: req.params.id }).del();
  } catch {}
  res.redirect('/devices');
});

router.post('/:id/history', requireRole('it_manager'), async (req, res) => {
  const { action, diagnosis, observations } = req.body;
  await db('maintenance_history').insert({
    device_id: req.params.id,
    it_manager_id: req.user.id,
    action,
    diagnosis: diagnosis?.trim() || null,
    observations: observations?.trim() || null,
  });
  res.redirect(`/devices/${req.params.id}`);
});

module.exports = router;

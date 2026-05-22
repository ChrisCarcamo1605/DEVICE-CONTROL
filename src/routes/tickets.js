const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const db = require('../config/db');

router.use(requireAuth);

const STATUS_LABELS = {
  pending: 'Pendiente',
  in_diagnosis: 'En diagnóstico',
  waiting_parts: 'Esperando repuestos',
  in_repair: 'En reparación',
  finalized: 'Finalizado',
  cancelled: 'Cancelado',
  delivered: 'Entregado',
};

// Transitions allowed per status (it_manager only)
const TRANSITIONS = {
  pending:       ['in_diagnosis', 'cancelled'],
  in_diagnosis:  ['waiting_parts', 'in_repair', 'finalized', 'cancelled'],
  waiting_parts: ['in_repair', 'cancelled'],
  in_repair:     ['finalized', 'cancelled'],
  finalized:     ['delivered'],
  cancelled:     [],
  delivered:     [],
};

// ── LIST ──────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, branch_id, it_manager_id } = req.query;
  const user = req.user;

  const query = db('tickets')
    .join('devices', 'tickets.device_id', 'devices.id')
    .join('branches', 'tickets.branch_id', 'branches.id')
    .join('profiles as reporter', 'tickets.reported_by', 'reporter.id')
    .leftJoin('profiles as manager', 'tickets.it_manager_id', 'manager.id')
    .select(
      'tickets.*',
      'devices.name as device_name',
      'branches.name as branch_name',
      'reporter.full_name as reporter_name',
      'manager.full_name as manager_name'
    )
    .orderBy('tickets.report_date', 'desc');

  if (user.role === 'branch_manager') query.where('tickets.branch_id', user.branch_id);
  if (status)       query.where('tickets.status', status);
  if (branch_id && user.role === 'it_manager') query.where('tickets.branch_id', branch_id);
  if (it_manager_id) query.where('tickets.it_manager_id', it_manager_id);

  const [tickets, branches, managers] = await Promise.all([
    query,
    db('branches').orderBy('name'),
    db('profiles').where({ role: 'it_manager' }).orderBy('full_name'),
  ]);

  res.render('tickets/index', {
    title: 'Tickets', path: '/tickets',
    tickets, branches, managers, STATUS_LABELS,
    filters: { status, branch_id, it_manager_id },
  });
});

// ── NEW ───────────────────────────────────────────────────────────────────────
router.get('/new', async (req, res) => {
  const user = req.user;
  const devicesQuery = db('devices')
    .join('branches', 'devices.branch_id', 'branches.id')
    .select('devices.id', 'devices.name', 'devices.serial_number', 'branches.name as branch_name')
    .where('devices.status', 'active')
    .orderBy('devices.name');

  if (user.role === 'branch_manager') devicesQuery.where('devices.branch_id', user.branch_id);

  const devices = await devicesQuery;
  res.render('tickets/form', {
    title: 'Nuevo ticket', path: '/tickets',
    ticket: null, devices, errors: [],
  });
});

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { device_id, problem_description } = req.body;
  const user = req.user;
  const errors = [];
  if (!device_id)                    errors.push('Selecciona un dispositivo.');
  if (!problem_description?.trim())  errors.push('Describe el problema.');

  if (errors.length) {
    const devicesQuery = db('devices')
      .join('branches', 'devices.branch_id', 'branches.id')
      .select('devices.id', 'devices.name', 'devices.serial_number', 'branches.name as branch_name')
      .where('devices.status', 'active').orderBy('devices.name');
    if (user.role === 'branch_manager') devicesQuery.where('devices.branch_id', user.branch_id);
    const devices = await devicesQuery;
    return res.render('tickets/form', {
      title: 'Nuevo ticket', path: '/tickets',
      ticket: req.body, devices, errors,
    });
  }

  const device = await db('devices').where({ id: device_id }).first();

  const [ticket] = await db('tickets').insert({
    device_id,
    branch_id: device.branch_id,
    reported_by: user.id,
    problem_description: problem_description.trim(),
    report_date: new Date(),
  }).returning('id');

  res.redirect(`/tickets/${ticket.id}`);
});

// ── SHOW ──────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const ticket = await db('tickets')
    .join('devices', 'tickets.device_id', 'devices.id')
    .join('branches', 'tickets.branch_id', 'branches.id')
    .join('profiles as reporter', 'tickets.reported_by', 'reporter.id')
    .leftJoin('profiles as manager', 'tickets.it_manager_id', 'manager.id')
    .select(
      'tickets.*',
      'devices.name as device_name', 'devices.id as device_id_ref', 'devices.serial_number',
      'branches.name as branch_name',
      'reporter.full_name as reporter_name',
      'manager.full_name as manager_name'
    )
    .where('tickets.id', req.params.id)
    .first();

  if (!ticket) return res.redirect('/tickets');

  const [tags, allTags, managers] = await Promise.all([
    db('ticket_tags')
      .join('defect_tags', 'ticket_tags.tag_id', 'defect_tags.id')
      .select('defect_tags.*')
      .where('ticket_tags.ticket_id', ticket.id),
    db('defect_tags').orderBy('name'),
    db('profiles').where({ role: 'it_manager' }).orderBy('full_name'),
  ]);

  const tagIds = tags.map(t => t.id);
  const nextStatuses = (TRANSITIONS[ticket.status] || []).map(s => ({ value: s, label: STATUS_LABELS[s] }));

  res.render('tickets/show', {
    title: `Ticket — ${ticket.device_name}`, path: '/tickets',
    ticket, tags, allTags, tagIds, managers, nextStatuses, STATUS_LABELS,
  });
});

// ── ASSIGN (it_manager takes ticket) ─────────────────────────────────────────
router.post('/:id/assign', requireRole('it_manager'), async (req, res) => {
  await db('tickets').where({ id: req.params.id }).update({
    it_manager_id: req.user.id,
    status: 'in_diagnosis',
    updated_at: new Date(),
  });
  res.redirect(`/tickets/${req.params.id}`);
});

// ── CHANGE STATUS ─────────────────────────────────────────────────────────────
router.post('/:id/status', requireRole('it_manager'), async (req, res) => {
  const { status, resolution_notes } = req.body;
  const ticket = await db('tickets').where({ id: req.params.id }).first();
  if (!ticket || !TRANSITIONS[ticket.status]?.includes(status)) {
    return res.redirect(`/tickets/${req.params.id}`);
  }
  const update = { status, updated_at: new Date() };
  if (resolution_notes?.trim()) update.resolution_notes = resolution_notes.trim();
  if (status === 'delivered') update.return_done_at = new Date();
  await db('tickets').where({ id: req.params.id }).update(update);
  res.redirect(`/tickets/${req.params.id}`);
});

// ── SCHEDULE COLLECTION ───────────────────────────────────────────────────────
router.post('/:id/schedule-collection', requireRole('it_manager'), async (req, res) => {
  const { collection_date } = req.body;
  await db('tickets').where({ id: req.params.id }).update({
    collection_date: collection_date || null,
    updated_at: new Date(),
  });
  res.redirect(`/tickets/${req.params.id}`);
});

// ── SCHEDULE RETURN ───────────────────────────────────────────────────────────
router.post('/:id/schedule-return', requireRole('it_manager'), async (req, res) => {
  const { return_date } = req.body;
  await db('tickets').where({ id: req.params.id }).update({
    return_date: return_date || null,
    updated_at: new Date(),
  });
  res.redirect(`/tickets/${req.params.id}`);
});

// ── TAGS ──────────────────────────────────────────────────────────────────────
router.post('/:id/tags', requireRole('it_manager'), async (req, res) => {
  const { tag_id } = req.body;
  try {
    await db('ticket_tags').insert({ ticket_id: req.params.id, tag_id });
  } catch {}
  res.redirect(`/tickets/${req.params.id}`);
});

router.post('/:id/tags/:tag_id/delete', requireRole('it_manager'), async (req, res) => {
  await db('ticket_tags').where({ ticket_id: req.params.id, tag_id: req.params.tag_id }).del();
  res.redirect(`/tickets/${req.params.id}`);
});

module.exports = router;

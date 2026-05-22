const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const db = require('../config/db');

router.use(requireAuth, requireRole('it_manager'));

const TYPE_LABELS = { spare_part: 'Repuesto', new_device: 'Equipo nuevo' };

// ── LIST ──────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { branch_id, type, ticket_id } = req.query;

  const query = db('purchases')
    .join('profiles', 'purchases.it_manager_id', 'profiles.id')
    .join('branches', 'purchases.branch_id', 'branches.id')
    .leftJoin('tickets', 'purchases.ticket_id', 'tickets.id')
    .leftJoin('devices', 'tickets.device_id', 'devices.id')
    .select(
      'purchases.*',
      'profiles.full_name as manager_name',
      'branches.name as branch_name',
      'devices.name as ticket_device_name'
    )
    .orderBy('purchases.purchase_date', 'desc');

  if (branch_id)  query.where('purchases.branch_id', branch_id);
  if (type)       query.where('purchases.type', type);
  if (ticket_id)  query.where('purchases.ticket_id', ticket_id);

  const [purchases, branches] = await Promise.all([
    query,
    db('branches').orderBy('name'),
  ]);

  const total = purchases.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  res.render('purchases/index', {
    title: 'Compras', path: '/purchases',
    purchases, branches, TYPE_LABELS, total,
    filters: { branch_id, type, ticket_id },
  });
});

// ── NEW ───────────────────────────────────────────────────────────────────────
router.get('/new', async (req, res) => {
  const { ticket_id } = req.query;
  const [branches, tickets] = await Promise.all([
    db('branches').orderBy('name'),
    db('tickets')
      .join('devices', 'tickets.device_id', 'devices.id')
      .join('branches', 'tickets.branch_id', 'branches.id')
      .whereNotIn('tickets.status', ['cancelled', 'delivered'])
      .select('tickets.id', 'tickets.branch_id', 'devices.name as device_name', 'branches.name as branch_name')
      .orderBy('devices.name'),
  ]);

  let preTicket = null;
  if (ticket_id) preTicket = tickets.find(t => t.id === ticket_id);

  res.render('purchases/form', {
    title: 'Registrar compra', path: '/purchases',
    purchase: ticket_id ? { ticket_id } : null,
    branches, tickets, TYPE_LABELS, preTicket, errors: [],
  });
});

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { ticket_id, branch_id, type, description, amount, invoice_number, purchase_date } = req.body;
  const errors = [];
  if (!branch_id)               errors.push('La sucursal destino es requerida.');
  if (!type)                    errors.push('El tipo es requerido.');
  if (!description?.trim())     errors.push('La descripción es requerida.');
  if (!amount || isNaN(amount)) errors.push('El monto es requerido.');
  if (!purchase_date)           errors.push('La fecha de compra es requerida.');

  if (errors.length) {
    const [branches, tickets] = await Promise.all([
      db('branches').orderBy('name'),
      db('tickets')
        .join('devices', 'tickets.device_id', 'devices.id')
        .join('branches', 'tickets.branch_id', 'branches.id')
        .whereNotIn('tickets.status', ['cancelled', 'delivered'])
        .select('tickets.id', 'tickets.branch_id', 'devices.name as device_name', 'branches.name as branch_name')
        .orderBy('devices.name'),
    ]);
    return res.render('purchases/form', {
      title: 'Registrar compra', path: '/purchases',
      purchase: req.body, branches, tickets, TYPE_LABELS, preTicket: null, errors,
    });
  }

  const [purchase] = await db('purchases').insert({
    ticket_id: ticket_id || null,
    it_manager_id: req.user.id,
    branch_id,
    type,
    description: description.trim(),
    amount: parseFloat(amount),
    invoice_number: invoice_number?.trim() || null,
    purchase_date,
  }).returning('id');

  // Auto-add maintenance history entry if linked to ticket
  if (ticket_id) {
    const ticket = await db('tickets').where({ id: ticket_id }).first();
    await db('maintenance_history').insert({
      device_id: ticket.device_id,
      ticket_id,
      it_manager_id: req.user.id,
      action: 'new_purchase',
      observations: `Compra registrada: ${description.trim()} — L ${parseFloat(amount).toLocaleString('es-HN')}`,
    });
  }

  // If linked to ticket redirect back to it
  if (ticket_id) return res.redirect(`/tickets/${ticket_id}`);
  res.redirect('/purchases');
});

// ── SHOW ──────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const purchase = await db('purchases')
    .join('profiles', 'purchases.it_manager_id', 'profiles.id')
    .join('branches', 'purchases.branch_id', 'branches.id')
    .leftJoin('tickets', 'purchases.ticket_id', 'tickets.id')
    .leftJoin('devices', 'tickets.device_id', 'devices.id')
    .select(
      'purchases.*',
      'profiles.full_name as manager_name',
      'branches.name as branch_name',
      'devices.name as ticket_device_name',
      'tickets.id as ticket_ref'
    )
    .where('purchases.id', req.params.id)
    .first();

  if (!purchase) return res.redirect('/purchases');

  res.render('purchases/show', {
    title: 'Detalle de compra', path: '/purchases',
    purchase, TYPE_LABELS,
  });
});

module.exports = router;

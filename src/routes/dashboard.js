const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const db = require('../config/db');

router.get('/', requireAuth, async (req, res) => {
  const user = req.user;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const scope = (q) => {
    if (user.role === 'branch_manager') q.where('branch_id', user.branch_id);
    return q;
  };

  const [devR, openR, pendR, delivR, inRepairR, purchasesR] = await Promise.all([
    scope(db('devices').where('status', 'active').count('id as count')),
    scope(db('tickets').whereNotIn('status', ['finalized', 'cancelled', 'delivered']).count('id as count')),
    scope(db('tickets').where('status', 'pending').count('id as count')),
    scope(db('tickets').where('status', 'delivered').where('updated_at', '>=', monthStart).count('id as count')),
    scope(db('tickets').where('status', 'in_repair').count('id as count')),
    user.role === 'it_manager'
      ? db('purchases').where('purchase_date', '>=', monthStart).sum('amount as total')
      : Promise.resolve([{ total: null }]),
  ]);

  const recentQ = db('tickets')
    .join('devices', 'tickets.device_id', 'devices.id')
    .join('branches', 'tickets.branch_id', 'branches.id')
    .leftJoin('profiles as mgr', 'tickets.it_manager_id', 'mgr.id')
    .select(
      'tickets.id', 'tickets.status', 'tickets.report_date', 'tickets.problem_description',
      'devices.name as device_name',
      'branches.name as branch_name',
      'mgr.full_name as manager_name'
    )
    .orderBy('tickets.report_date', 'desc')
    .limit(8);

  if (user.role === 'branch_manager') recentQ.where('tickets.branch_id', user.branch_id);

  // For IT Manager: tickets per status breakdown
  const statusBreakdownQ = db('tickets')
    .select('status')
    .count('id as count')
    .groupBy('status');

  const [recentTickets, statusBreakdown] = await Promise.all([recentQ, statusBreakdownQ]);

  const STATUS_LABELS = {
    pending: 'Pendiente', in_diagnosis: 'En diagnóstico',
    waiting_parts: 'Esperando repuestos', in_repair: 'En reparación',
    finalized: 'Finalizado', cancelled: 'Cancelado', delivered: 'Entregado',
  };

  res.render('dashboard/index', {
    title: 'Dashboard',
    path: '/dashboard',
    stats: {
      devices: devR[0].count,
      openTickets: openR[0].count,
      pendingTickets: pendR[0].count,
      deliveredTickets: delivR[0].count,
      inRepair: inRepairR[0].count,
      monthlyPurchases: purchasesR[0].total,
    },
    recentTickets,
    statusBreakdown,
    STATUS_LABELS,
  });
});

module.exports = router;

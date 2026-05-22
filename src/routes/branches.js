const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const db = require('../config/db');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const branches = await db('branches')
    .leftJoin('locations', 'branches.location_id', 'locations.id')
    .select('branches.*', 'locations.name as location_name', 'locations.department');
  res.render('branches/index', { title: 'Sucursales', path: '/branches', branches });
});

router.get('/new', requireRole('it_manager'), async (req, res) => {
  const locations = await db('locations').orderBy('department').orderBy('name');
  res.render('branches/form', { title: 'Nueva sucursal', path: '/branches', branch: null, locations, errors: [] });
});

router.post('/', requireRole('it_manager'), async (req, res) => {
  const { name, address, location_id, phone } = req.body;
  if (!name?.trim()) {
    const locations = await db('locations').orderBy('name');
    return res.render('branches/form', {
      title: 'Nueva sucursal', path: '/branches', branch: req.body,
      locations, errors: ['El nombre es requerido.'],
    });
  }
  await db('branches').insert({
    name: name.trim(),
    address: address?.trim() || null,
    location_id: location_id || null,
    phone: phone?.trim() || null,
  });
  res.redirect('/branches');
});

router.get('/:id/edit', requireRole('it_manager'), async (req, res) => {
  const branch = await db('branches').where({ id: req.params.id }).first();
  if (!branch) return res.redirect('/branches');
  const locations = await db('locations').orderBy('department').orderBy('name');
  res.render('branches/form', { title: 'Editar sucursal', path: '/branches', branch, locations, errors: [] });
});

router.post('/:id', requireRole('it_manager'), async (req, res) => {
  const { name, address, location_id, phone } = req.body;
  if (!name?.trim()) {
    const locations = await db('locations').orderBy('name');
    return res.render('branches/form', {
      title: 'Editar sucursal', path: '/branches',
      branch: { id: req.params.id, ...req.body },
      locations, errors: ['El nombre es requerido.'],
    });
  }
  await db('branches').where({ id: req.params.id }).update({
    name: name.trim(),
    address: address?.trim() || null,
    location_id: location_id || null,
    phone: phone?.trim() || null,
    updated_at: new Date(),
  });
  res.redirect('/branches');
});

router.post('/:id/delete', requireRole('it_manager'), async (req, res) => {
  try {
    await db('branches').where({ id: req.params.id }).del();
  } catch {
    // referenced by devices/profiles — ignore
  }
  res.redirect('/branches');
});

module.exports = router;

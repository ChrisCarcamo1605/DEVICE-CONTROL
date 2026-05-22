const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const db = require('../config/db');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const locations = await db('locations').orderBy('department').orderBy('name');
  res.render('locations/index', { title: 'Ubicaciones', path: '/locations', locations });
});

router.get('/new', requireRole('it_manager'), (req, res) => {
  res.render('locations/form', { title: 'Nueva ubicación', path: '/locations', location: null, errors: [] });
});

router.post('/', requireRole('it_manager'), async (req, res) => {
  const { name, department, country } = req.body;
  if (!name?.trim() || !department?.trim()) {
    return res.render('locations/form', {
      title: 'Nueva ubicación', path: '/locations', location: req.body,
      errors: ['Nombre y departamento son requeridos.'],
    });
  }
  await db('locations').insert({ name: name.trim(), department: department.trim(), country: (country || 'Honduras').trim() });
  res.redirect('/locations');
});

router.get('/:id/edit', requireRole('it_manager'), async (req, res) => {
  const location = await db('locations').where({ id: req.params.id }).first();
  if (!location) return res.redirect('/locations');
  res.render('locations/form', { title: 'Editar ubicación', path: '/locations', location, errors: [] });
});

router.post('/:id', requireRole('it_manager'), async (req, res) => {
  const { name, department, country } = req.body;
  if (!name?.trim() || !department?.trim()) {
    return res.render('locations/form', {
      title: 'Editar ubicación', path: '/locations',
      location: { id: req.params.id, ...req.body },
      errors: ['Nombre y departamento son requeridos.'],
    });
  }
  await db('locations').where({ id: req.params.id })
    .update({ name: name.trim(), department: department.trim(), country: (country || 'Honduras').trim(), updated_at: new Date() });
  res.redirect('/locations');
});

router.post('/:id/delete', requireRole('it_manager'), async (req, res) => {
  try {
    await db('locations').where({ id: req.params.id }).del();
  } catch {
    // referenced by branches — ignore silently and redirect
  }
  res.redirect('/locations');
});

module.exports = router;

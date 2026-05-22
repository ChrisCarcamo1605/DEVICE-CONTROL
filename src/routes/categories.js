const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const db = require('../config/db');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const categories = await db('device_categories').orderBy('name');
  res.render('categories/index', { title: 'Categorías', path: '/categories', categories });
});

router.get('/new', requireRole('it_manager'), (req, res) => {
  res.render('categories/form', { title: 'Nueva categoría', path: '/categories', category: null, errors: [] });
});

router.post('/', requireRole('it_manager'), async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.render('categories/form', { title: 'Nueva categoría', path: '/categories', category: req.body, errors: ['El nombre es requerido.'] });
  }
  try {
    await db('device_categories').insert({ name: name.trim() });
  } catch {
    return res.render('categories/form', { title: 'Nueva categoría', path: '/categories', category: req.body, errors: ['Ya existe una categoría con ese nombre.'] });
  }
  res.redirect('/categories');
});

router.get('/:id/edit', requireRole('it_manager'), async (req, res) => {
  const category = await db('device_categories').where({ id: req.params.id }).first();
  if (!category) return res.redirect('/categories');
  res.render('categories/form', { title: 'Editar categoría', path: '/categories', category, errors: [] });
});

router.post('/:id', requireRole('it_manager'), async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.render('categories/form', { title: 'Editar categoría', path: '/categories', category: { id: req.params.id, ...req.body }, errors: ['El nombre es requerido.'] });
  }
  try {
    await db('device_categories').where({ id: req.params.id }).update({ name: name.trim(), updated_at: new Date() });
  } catch {
    return res.render('categories/form', { title: 'Editar categoría', path: '/categories', category: { id: req.params.id, ...req.body }, errors: ['Ya existe una categoría con ese nombre.'] });
  }
  res.redirect('/categories');
});

router.post('/:id/delete', requireRole('it_manager'), async (req, res) => {
  try {
    await db('device_categories').where({ id: req.params.id }).del();
  } catch {}
  res.redirect('/categories');
});

module.exports = router;

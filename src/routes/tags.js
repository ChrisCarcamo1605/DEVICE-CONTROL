const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const db = require('../config/db');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const tags = await db('defect_tags').orderBy('name');
  res.render('tags/index', { title: 'Tags de Defecto', path: '/tags', tags });
});

router.get('/new', requireRole('it_manager'), (req, res) => {
  res.render('tags/form', { title: 'Nuevo tag', path: '/tags', tag: null, errors: [] });
});

router.post('/', requireRole('it_manager'), async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.render('tags/form', { title: 'Nuevo tag', path: '/tags', tag: req.body, errors: ['El nombre es requerido.'] });
  }
  try {
    await db('defect_tags').insert({ name: name.trim() });
  } catch {
    return res.render('tags/form', { title: 'Nuevo tag', path: '/tags', tag: req.body, errors: ['Ya existe un tag con ese nombre.'] });
  }
  res.redirect('/tags');
});

router.get('/:id/edit', requireRole('it_manager'), async (req, res) => {
  const tag = await db('defect_tags').where({ id: req.params.id }).first();
  if (!tag) return res.redirect('/tags');
  res.render('tags/form', { title: 'Editar tag', path: '/tags', tag, errors: [] });
});

router.post('/:id', requireRole('it_manager'), async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.render('tags/form', { title: 'Editar tag', path: '/tags', tag: { id: req.params.id, ...req.body }, errors: ['El nombre es requerido.'] });
  }
  try {
    await db('defect_tags').where({ id: req.params.id }).update({ name: name.trim(), updated_at: new Date() });
  } catch {
    return res.render('tags/form', { title: 'Editar tag', path: '/tags', tag: { id: req.params.id, ...req.body }, errors: ['Ya existe un tag con ese nombre.'] });
  }
  res.redirect('/tags');
});

router.post('/:id/delete', requireRole('it_manager'), async (req, res) => {
  try {
    await db('defect_tags').where({ id: req.params.id }).del();
  } catch {}
  res.redirect('/tags');
});

module.exports = router;

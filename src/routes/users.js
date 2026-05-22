const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const db = require('../config/db');
const supabase = require('../config/supabase');

router.use(requireAuth, requireRole('it_manager'));

router.get('/', async (req, res) => {
  const users = await db('profiles')
    .leftJoin('branches', 'profiles.branch_id', 'branches.id')
    .select('profiles.*', 'branches.name as branch_name')
    .orderBy('profiles.full_name');
  res.render('users/index', { title: 'Usuarios', path: '/users', users });
});

router.get('/new', async (req, res) => {
  const branches = await db('branches').orderBy('name');
  res.render('users/form', { title: 'Nuevo usuario', path: '/users', userData: null, branches, errors: [] });
});

router.post('/', async (req, res) => {
  const { full_name, email, password, role, branch_id } = req.body;
  const errors = [];
  if (!full_name?.trim()) errors.push('El nombre es requerido.');
  if (!email?.trim()) errors.push('El correo es requerido.');
  if (!password || password.length < 6) errors.push('La contraseña debe tener al menos 6 caracteres.');
  if (!role) errors.push('El rol es requerido.');
  if (role === 'branch_manager' && !branch_id) errors.push('Debes asignar una sucursal al gerente.');

  if (errors.length) {
    const branches = await db('branches').orderBy('name');
    return res.render('users/form', { title: 'Nuevo usuario', path: '/users', userData: req.body, branches, errors });
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim() },
  });

  if (error) {
    const branches = await db('branches').orderBy('name');
    return res.render('users/form', { title: 'Nuevo usuario', path: '/users', userData: req.body, branches, errors: [error.message] });
  }

  await db('profiles').insert({
    id: data.user.id,
    full_name: full_name.trim(),
    email: email.trim(),
    role,
    branch_id: branch_id || null,
  });

  res.redirect('/users');
});

router.get('/:id/edit', async (req, res) => {
  const userData = await db('profiles').where({ id: req.params.id }).first();
  if (!userData) return res.redirect('/users');
  const branches = await db('branches').orderBy('name');
  res.render('users/form', { title: 'Editar usuario', path: '/users', userData, branches, errors: [] });
});

router.post('/:id', async (req, res) => {
  const { full_name, role, branch_id } = req.body;
  const errors = [];
  if (!full_name?.trim()) errors.push('El nombre es requerido.');
  if (!role) errors.push('El rol es requerido.');
  if (role === 'branch_manager' && !branch_id) errors.push('Debes asignar una sucursal al gerente.');

  if (errors.length) {
    const branches = await db('branches').orderBy('name');
    return res.render('users/form', { title: 'Editar usuario', path: '/users', userData: { id: req.params.id, ...req.body }, branches, errors });
  }

  await db('profiles').where({ id: req.params.id }).update({
    full_name: full_name.trim(),
    role,
    branch_id: branch_id || null,
    updated_at: new Date(),
  });

  res.redirect('/users');
});

router.post('/:id/delete', async (req, res) => {
  try {
    await supabase.auth.admin.deleteUser(req.params.id);
    await db('profiles').where({ id: req.params.id }).del();
  } catch {}
  res.redirect('/users');
});

module.exports = router;

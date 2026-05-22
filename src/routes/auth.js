const router = require('express').Router();
const supabase = require('../config/supabase');
const db = require('../config/db');

router.get('/login', (req, res) => {
  if (req.cookies?.access_token) return res.redirect('/dashboard');
  res.render('auth/login', { layout: false });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.render('auth/login', { layout: false, error: 'Credenciales incorrectas.' });
  }

  const profile = await db('profiles').where({ id: data.user.id }).first();
  if (!profile) {
    return res.render('auth/login', { layout: false, error: 'Usuario sin perfil configurado.' });
  }

  res.cookie('access_token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.redirect('/dashboard');
});

router.post('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.redirect('/auth/login');
});

module.exports = router;

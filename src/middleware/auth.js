const supabase = require('../config/supabase');
const db = require('../config/db');

async function requireAuth(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.redirect('/auth/login');

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.redirect('/auth/login');

  const profile = await db('profiles').where({ id: user.id }).first();
  if (!profile) return res.redirect('/auth/login');

  req.user = { ...user, ...profile };
  res.locals.user = req.user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).render('errors/403', { layout: 'layouts/main' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };

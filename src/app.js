require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Inject current path into all views
app.use((req, res, next) => {
  res.locals.path = req.path;
  res.locals.flash = null;
  next();
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/locations', require('./routes/locations'));
app.use('/branches', require('./routes/branches'));
app.use('/categories', require('./routes/categories'));
app.use('/tags', require('./routes/tags'));
app.use('/devices', require('./routes/devices'));
app.use('/tickets', require('./routes/tickets'));
app.use('/purchases', require('./routes/purchases'));
app.use('/users', require('./routes/users'));

// API endpoint: purchases by ticket (used by ticket show page)
app.get('/api/tickets/:id/purchases', require('./middleware/auth').requireAuth, async (req, res) => {
  const db = require('./config/db');
  const purchases = await db('purchases')
    .where({ ticket_id: req.params.id })
    .orderBy('purchase_date', 'desc')
    .select('id', 'description', 'type', 'amount', 'purchase_date');
  res.json(purchases);
});

// Root redirect
app.get('/', (req, res) => res.redirect('/dashboard'));

// 404
app.use((req, res) => {
  res.status(404).send('Página no encontrada');
});

module.exports = app;

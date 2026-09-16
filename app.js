require('dotenv').config({ override: true });
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var animalsRouter = require('./routes/animals');
var markersRouter = require('./routes/markers');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
var os = require('os');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/media', express.static(path.join(__dirname, 'backend', 'media')));
app.use('/media', express.static(path.join(__dirname, 'public', 'media')));
app.use('/media', express.static(path.join(os.tmpdir(), 'media')));


var v1Router = require('./routes/v1');

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/animals', animalsRouter);
app.use('/api/markers', markersRouter);
app.use('/api/v1', v1Router);

// Rota para a página de animais
app.get('/animais', function(req, res) {
  res.render('animais', { title: 'Gralha dos Ventos' });
});

// Rota para a página de login de administração
app.get('/admin/login', function(req, res) {
  res.render('admin-login', { title: 'Gralha dos Ventos' });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  var status = err.status || 500;
  var errorMessage = err.message || 'Erro interno no servidor';
  console.error('Erro na aplicação Express:', err);

  res.status(status).json({
    success: false,
    message: errorMessage,
    error: errorMessage,
    details: req.app.get('env') === 'development' ? err.stack : undefined
  });
});

module.exports = app;

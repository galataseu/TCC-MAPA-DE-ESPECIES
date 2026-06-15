var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var animalsRouter = require('./routes/animals');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// app.use('/icons', express.static(path.join(__dirname, 'icons'))); // Removed as folder is in public

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/animals', animalsRouter);

// Rota para a página de animais
app.get('/animais', function(req, res) {
  res.render('animais', { title: 'Espécies Ameaçadas - Lista' });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // send the error response
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: res.locals.error
  });
});

module.exports = app;

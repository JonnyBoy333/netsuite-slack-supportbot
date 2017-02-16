var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

if (!process.env.SLACK_KEY || !process.env.SLACK_SECRET || !process.env.NETSUITE_KEY || !process.env.NETSUITE_SECRET) {
    console.log('Error: Specify clientId and clientSecret in environment');
    process.exit(1);
}

mongoose.Promise = global.Promise;
var mongodbUri = process.env.MONGODB_URI;
var options = {
    server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } },
    replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS : 30000 } }
};
mongoose.connect(mongodbUri, options);

//var slack_listener = require('./routes/slack_listener');
//var netsuite_listener = require('./routes/netsuite_listener');
var slack = require('./routes/slack');
var heroku_keep_alive = require('./routes/heroku_keep_alive');
//var nsOath = require('./routes/netsuite_oauth');
//var emailCapture = require('./routes/netsuite_email_capture');
var index = require('./routes/index');
var apiRouter = require('./api');
//require('./routes/slack_button');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/slack', slack);
//app.use('/slack_listener', slack_listener);
//app.use('/netsuite_listener', netsuite_listener);
//app.use('/netsuite_oauth', nsOath);
//app.use('/netsuite_email_capture', emailCapture);
app.use('/api', apiRouter);
app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;

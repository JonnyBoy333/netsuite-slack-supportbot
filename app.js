var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
//var Botkit = require('botkit');

var slack_listener = require('./routes/slack_listener');
var netsuite_listener = require('./routes/netsuite_listener');
var users = require('./routes/users');

var app = express();
// var controller = Botkit.slackbot();
// var bot = controller.spawn({
//     token: 'xoxb-39896988051-VhGDhjPGmlZEEcUMmDCMpHPt'
// });
//
// bot.startRTM(function(err, bot, payload){
//     if (err){
//         throw new Error('Could not connect to slack.');
//     }
// });
//
// controller.hears(['hello','hi'],['direct_message','direct_mention','mention'],function(bot,message) {
//     bot.reply(message,"Hello.");
// });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/slack_listener', slack_listener);
app.use('/netsuite_listener', netsuite_listener);
app.use('/users', users);

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

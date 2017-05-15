var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var mongooseDB = mongoose.connection;
var passport = require('passport');
var tokenSchema = require('./models/schemas').tokens;
var BearerStrategy = require('passport-http-bearer').Strategy;
var controller = require('./modules/bot_controller');
var ua = require('universal-analytics');
var Logger = require('le_node');
var winston = require('winston');

//Setup external logging
var logEntriesKey = process.env.NODE_ENV === 'Production' ? process.env.LOG_ENTRIES : process.env.LOG_ENTRIES_DEV;
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Logentries)({
            token: logEntriesKey,
            handleExceptions: true,
            humanReadableUnhandledException: true
        })
    ]
});
logger.exitOnError = false;
//var ga = require('./modules/ga');
//var visitor = ua('UA-3542953-4');

if (!process.env.SLACK_KEY || !process.env.SLACK_SECRET || !process.env.NETSUITE_KEY || !process.env.NETSUITE_SECRET) {
    console.log('Error: Specify clientId and clientSecret in environment');
    logger.warn('Error: Specify clientId and clientSecret in environment');
    process.exit(1);
}


//Connect to database and handle errors
mongoose.Promise = global.Promise;
var mongodbUri = process.env.NODE_ENV === 'Production' ? process.env.MONGODB_URI : process.env.MONGODB_URI_DEV;
var options = {
    server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
    replset: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } }
};
mongooseDB.on('connecting', function() {
    console.log('connecting to MongoDB...');
});
mongooseDB.on('error', function(error) {
    console.error('Error in MongoDb connection: ' + error);
    logger.warn('Error in MongoDb connection: ' + error);
    mongoose.disconnect();
});
mongooseDB.on('connected', function() {
    console.log('MongoDB connected!');
});
mongooseDB.once('open', function() {
    console.log('MongoDB connection opened!');
});
mongooseDB.on('reconnected', function () {
    console.log('MongoDB reconnected!');
});
mongooseDB.on('disconnected', function() {
    console.log('MongoDB disconnected!');
    mongoose.connect(mongodbUri, options);
});
mongoose.connect(mongodbUri, options);


//Configure passport
passport.use(new BearerStrategy({}, function(token, done) {
    tokenSchema.findOne({ token: token }, function(err, token) {
        if (!token) return done(null, false);
        return done(null, token);
    })
}));

var slack = require('./routes/slacklistener');
var heroku_keep_alive = require('./routes/heroku_keep_alive');
var index = require('./routes/index');
var privacypolicy = require('./routes/privacypolicy');
var instructions = require('./routes/instructions');
var contact = require('./routes/contact');
var apiRouter = require('./api');

var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
var analyticsId = process.env.NODE_ENV === 'Production' ? process.env.ANALYTICS_ID : process.env.ANALYTICS_ID_DEV;
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/slacklistener', slack);
app.use('/api', apiRouter);
app.use('/', index);
app.use('/instructions', instructions);
app.use('/privacypolicy', privacypolicy);
app.use('/contact', contact);
app.use(ua.middleware(analyticsId, { cookieName: '_ga' }));

//Create slackbot button endpoints server
controller.createWebhookEndpoints(app, process.env.VERIFICATION_TOKEN);

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
  app.use(function(err, req, res) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;

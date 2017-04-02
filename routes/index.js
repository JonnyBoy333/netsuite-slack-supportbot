var express = require('express');
var router = express.Router();
var ga = require('../modules/ga');

/* GET home page. */
router.get('/',
    ga.pageview('Home Page'),
    function(req, res, next) {
    res.render('index', {
        title: 'NetSuite Support Slack Bot',
        home: 'active',
        instructions: '',
        privacypolicy: '',
        contact: ''
    });
    //res.send('Support Bot is up and running!');
});

module.exports = router;
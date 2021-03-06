var express = require('express');
var router = express.Router();
var ga = require('../modules/ga');

/* GET home page. */
router.get('/',
    ga.pageview('Privacy Policy'),
    function(req, res, next) {
        res.render('privacypolicy', {
            title: 'Privacy Policy',
            home: '',
            instructions: '',
            privacypolicy: 'active',
            contact: ''
        });
    }
);

module.exports = router;
var express = require('express');
var router = express.Router();
var ga = require('../modules/ga');

/* GET home page. */
router.get('/',
    ga.pageview('Instructions'),
    function(req, res, next) {
        res.render('instructions', {
            title: 'Instructions',
            home: '',
            instructions: 'active',
            privacypolicy: '',
            contact: ''
        });
    }
);

module.exports = router;
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('privacypolicy', { title: 'Privacy Policy' });
});

module.exports = router;
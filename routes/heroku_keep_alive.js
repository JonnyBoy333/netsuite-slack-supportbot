var express = require('express');
var http = require("http");
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    //Heroku keep alive
    var hour = new Date().getHours();
    console.log("The hour is: " + hour);

    setInterval(function() {
        if (hour <= 24) {
            console.log("Beginning of Looping " + hour);
            http.get("https://slackbot-2.herokuapp.com/");
        }
        var d = new Date();
        hour = d.getHours();
        console.log("End of Loop " + d + "-" + hour);
    }, 600000); // every 5 minutes (3000000)
    res.render('index', { title: 'Express' });
  res.render('index', { title: 'Express' });
});

module.exports = router;
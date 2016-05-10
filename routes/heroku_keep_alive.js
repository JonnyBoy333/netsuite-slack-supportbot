var express = require('express');
var http = require("http");
var router = express.Router();

//Heroku keep alive
var hour = new Date().getHours();
console.log("The hour is: " + hour);

setInterval(function() {
    if (hour <= 24 && hour >= 7) {
        http.get("http://slackbot-2.herokuapp.com/");
    }
    var d = new Date();
    hour = d.getHours();
    console.log("The time is: " + d + "-" + hour);
}, 600000); // every 5 minutes (3000000)

module.exports = router;
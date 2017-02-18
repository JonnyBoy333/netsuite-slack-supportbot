var express = require('express');
var https = require("https");
var router = express.Router();

//Heroku keep alive
var hour = new Date().getHours();
console.log("The hour is: " + hour);

setInterval(function() {
    if (process.env.NODE_ENV === 'Production') {
        https.get("https://netsuite-slack-supportbot.herokuapp.com/");
    } else {
        https.get("https://netsuite-slack-supportbot-dev.herokuapp.com/");
    }
    var d = new Date();
    hour = d.getHours();
    console.log("The time is: " + d + "-" + hour);
}, 30000); // every 5 minutes (3000000)

module.exports = router;
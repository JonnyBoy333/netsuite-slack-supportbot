/**
 * Created by jonlamb on 5/5/16.
 */

var express = require('express');
var router = express.Router();
var qs = require('querystring');
var url = require('url');
var Botkit = require('botkit');
var request = require("request");
var http = require("http");
//var url = require("url");
var qs = require("querystring");

var controller = Botkit.slackbot();
var webhooksBot = controller.spawn({
    incoming_webhook: {
        url: 'https://hooks.slack.com/services/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'
    }
})

/* GET home page. */
router.post('/', function (req, res, next) {
    var body = req.body;
    console.log('body: ' + JSON.stringify(body));
    console.log('headers: ' + JSON.stringify(req.headers));
    var dirtyMessage = body.fields[2].value;
    if (dirtyMessage){
        var cleanMessage = sanitizeHtml(dirtyMessage, {
            allowedTags: [ ],
            allowedAttributes: [ ]
        });
        console.log('Clean message: ' + cleanMessage);
        var trimmedMessage = cleanMessage.trim();
        var removeBlanks = /[\r\n]{2,}/g;
        var noBlankLinesMessage = trimmedMessage.replace(removeBlanks, '\r\n');
        console.log('No Blanks: ' + noBlankLinesMessage);
        if (noBlankLinesMessage.length > 500){
            body.fields[2].value = noBlankLinesMessage.substring(0, 500) + "...";
        } else {
            body.fields[2].value = noBlankLinesMessage;
        }

    }
    console.log('Slack Attachment: ' + JSON.stringify(body));
    webhooksBot.sendWebhook({
        channel: '#testing',
        username: "support",
        icon_emoji: ":support:",
        attachments: body
    },function(err,res) {
        if (err) {
            console.log(err)
        }
    });
    res.end("NetSuite Listener");
});

module.exports = router;
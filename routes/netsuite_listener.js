/**
 * Created by jonlamb on 5/5/16.
 */

var express = require('express');
var router = express.Router();
var Botkit = require('botkit');
var sanitizeHtml = require('sanitize-html');

//Create Bot
var controller = Botkit.slackbot();
var webhooksBot = controller.spawn({
    incoming_webhook: {
        url: 'https://hooks.slack.com/services/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'
    }
})

webhooksBot.sendWebhook({
    fallback: 'Fallback Message',
    Text: 'Some Text',
    fields:[
        {
            "title": "Hello",
            "value": "World",
            "short": true
        }
        ]
},function(err,res) {
    if (err) {
        console.log(err)
    }
});

/* GET home page. */
router.post('/', function (req, res, next) {
    var attachment = req.body;
    console.log('body: ' + JSON.stringify(attachment));
    console.log('headers: ' + JSON.stringify(req.headers));
    var dirtyMessage = attachment.fields[2].value;
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
            attachment.fields[2].value = noBlankLinesMessage.substring(0, 500) + "...";
        } else {
            attachment.fields[2].value = noBlankLinesMessage;
        }

    }
    attachment.channel = '#support_cases';
    attachment.username = 'support';
    attachment.icon_emoji = ':support:'
    console.log('Slack Attachment: ' + JSON.stringify(attachment));
    webhooksBot.sendWebhook(attachment,function(err,res) {
        if (err) {
            console.log(err)
        }
    });
    res.end("NetSuite Listener");
});
module.exports = router;
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
});

/* GET home page. */
router.post('/', function (req, res, next) {
    var attachment = req.body;
    console.log('data: ' + JSON.stringify(req));
    //console.log('headers: ' + JSON.stringify(req.headers));
    var dirtyMessage = attachment.fields[2].value;
    if (dirtyMessage){
        var cleanMessage = sanitizeHtml(dirtyMessage, {
            allowedTags: [ ],
            allowedAttributes: [ ]
        });
        //console.log('Clean message: ' + cleanMessage);
        var trimmedMessage = cleanMessage.trim();
        var removeBlanks = /[\r\n]{2,}/g;
        var noBlankLinesMessage = trimmedMessage.replace(removeBlanks, '\r\n');
        console.log('No Blanks: ' + noBlankLinesMessage);
        attachment.fields[2].value = noBlankLinesMessage;
    }
    var attachmentMessage = {
        channel: '#support_cases',
        username: 'support',
        icon_emoji: ':support:',
        attachments: [attachment]
    };
    console.log('Slack Attachment: ' + JSON.stringify(attachmentMessage));
    // webhooksBot.sendWebhook(attachmentMessage,function(err,res) {
    //     if (err) {
    //         console.log(err)
    //     }
    // });
    res.end("NetSuite Listener");
});

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Jon\'s Awesome Node App' });
});

module.exports = router;
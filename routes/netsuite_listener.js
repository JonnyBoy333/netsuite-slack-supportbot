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
var rtmBot = controller.spawn({
    token: 'xoxb-15323778418-BRvb2hDVdIcyNwLL0Oi9iju4'
});

//Retrieves the user's ID from slack
function getUserId (name){
    return new Promise(function(resolve, reject){
        rtmBot.api.users.list({},function(err,response) {
            console.log(JSON.stringify(response));
            for (var i = 0, userId; i < response.members.length; i++){
                var member = response.members[i];
                if (name == member.real_name){userId = member.id}
            }
            resolve(userId);
            if (err){
                reject(err);
            }
        })
    })
}

/* GET home page. */
router.post('/', function (req, res, next) {
    var attachment = req.body;
    console.log('body: ' + JSON.stringify(attachment));
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

    if (attachment.assigned){
        getUserId(attachment.assigned)
        .then(function(userId) {
            console.log(userId);
            delete attachment.assigned;
            var slackAttachment = {
                "attachments": [attachment],
                "username": "support",
                "icon_emoji": ":support:",
                "channel": userId
            };
            console.log('RTM Slack Attachment: ' + JSON.stringify(slackAttachment));
            rtmBot.say(slackAttachment);
        })
    } else {
        var attachmentMessage = {
            channel: '#support_cases',
            username: 'support',
            icon_emoji: ':support:',
            attachments: [attachment]
        };
        console.log('Webhooks Slack Attachment: ' + JSON.stringify(attachmentMessage));
        webhooksBot.sendWebhook(attachmentMessage,function(err,res) {
            if (err) {
                console.log(err)
            }
        });
    }
    res.end("NetSuite Listener");
});

/* GET home page. */
router.get('/', function(req, res, next) {
    console.log('Body: ' + JSON.stringify(req.body));
    console.log('Headers: ' + JSON.stringify(req.headers));
    res.render('index', { title: 'Jon\'s Awesome Node App' });
});

module.exports = router;
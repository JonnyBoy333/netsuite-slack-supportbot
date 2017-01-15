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
        console.log('Name: ', name);
        var userId;
        if (!name) {
            userId = '#testing';
            resolve(userId);
        } else {
            rtmBot.api.users.list({},function(err,response) {
                //console.log(JSON.stringify(response));
                for (var i = 0; i < response.members.length; i++){
                    var member = response.members[i];
                    if (name == member.real_name){
                        userId = member.id;
                        break;
                    }
                }
                resolve(userId);
                if (err){
                    reject(err);
                }
            })
        }
    })
}

// Promise.prototype.thenReturn = function(value) {
//     return this.then(function() {
//         return value;
//     });
// };
//
// function sendMessage(index) {
//     return new Promise(function(resolve) {
//         setTimeout(function() {
//             console.log("Read file number " + (index +1));
//             resolve();
//         }, 500);
//     });
// }
//
// // The loop initialization
// var len = slackMessages.length;
// Promise.resolve(0).then(function loop(i) {
//     // The loop check
//     if (i < len) { // The post iteration increment
//         return sendMessage(i).thenReturn(i + 1).then(loop);
//     }
// }).then(function() {
//     console.log("All messages sent");
// }).catch(function(e) {
//     console.log("error", e);
// });


/* GET home page. */
router.post('/', function (req, res, next) {
    var message = req.body;
    console.log('body: ' + JSON.stringify(message));
    var slackMessages = message['slack_messages']
    //console.log('headers: ' + JSON.stringify(req.headers));
    for (var i = 0; i < slackMessages.length; i++) {
        var attachment = slackMessages[i];
        if (i === 0) {
            var dirtyMessage = attachment.fields[2].value;
            if (dirtyMessage) {
                var cleanMessage = sanitizeHtml(dirtyMessage, {
                    allowedTags: [],
                    allowedAttributes: []
                });
                //console.log('Clean message: ' + cleanMessage);
                var trimmedMessage = cleanMessage.trim();
                var removeBlanks = /[\r\n]{2,}/g;
                var noBlankLinesMessage = trimmedMessage.replace(removeBlanks, '\r\n');
                console.log('No Blanks: ' + noBlankLinesMessage);
                attachment.fields[2].value = noBlankLinesMessage;
            }
        }

        if (message.type === 'casereply'){
            getUserId(message.assigned)
            .then(function(userId) {
                console.log('User ID: ', userId);
                var slackAttachment = {
                    "attachments": [attachment],
                    "channel": userId
                };
                console.log('RTM Slack Attachment: ' + JSON.stringify(slackAttachment));
                rtmBot.say(slackAttachment);
            })
        } else if (message.type === 'newcase') {
            var attachmentMessage = {
                channel: '#support_cases',
                channel: '#testing',
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
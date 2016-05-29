/**
 * Created by jonlamb on 5/5/16.
 */

var express = require('express');
var router = express.Router();
var Botkit = require('botkit');
var sanitizeHtml = require('sanitize-html');
var cheerio = require('cheerio');

//Create Bot
var controller = Botkit.slackbot();
var webhooksBot = controller.spawn({
    incoming_webhook: {
        url: 'https://hooks.slack.com/services/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'
    }
});

/* GET home page. */
router.post('/', function (req, res, next) {
    console.log('recipient: ' + req.body.recipient);
    console.log('sender: ' + req.body.sender);
    console.log('subject: ' + req.body.subject);
    //console.log('body: ' + req.body['stripped-text']);
    //console.log('HTML: ' + req.body['stripped-html']);
    var $ = cheerio.load(req.body['stripped-html']);
    console.log('Hello');
    var $cells = $('td');
    console.log($cells);
    console.log(JSON.stringify($cells));
    $cells.each(function(i, field){
        console.log(field.text());
        // if(fields.eq(i).attr('id') === 'custbody_prevailing_wage_info_fs_lbl'){
        //     fields.eq(i + 1).css('background-color', 'yellow');
        // }
    })
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
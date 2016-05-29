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
    var $cells = $('td');
    //console.log($cells.text());
    console.log('Number of cells: ' + $cells.length);
    // console.log(JSON.stringify($cells));
    var message = {
        lastMessageDate: {
            keyword: 'Last Msg. Date',
            text: null
        },
        internalID: {
            keyword: 'Internal ID',
            text: null
        },
        number: {
            keyword: 'Number',
            text: null
        },
        company: {
            keyword: 'Company',
            text: null
        },
        contact: {
            keyword: 'Contact',
            text: null
        },
        messageDate: {
            keyword: 'Message Date',
            text: null
        },
        dateCreated: {
            keyword: 'Date Created',
            text: null
        },
        messageAuthor: {
            keyword: 'Message Author',
            text: null
        },
        caseURL: {
            keyword: 'Case URL',
            text: null
        },
        companyURL: {
            keyword: 'Company URL',
            text: null
        },
        contactURL: {
            keyword: 'Contact URL',
            text: null
        },
        message: {
            keyword: 'Message HTML',
            text: null
        }
    }
    // var array = $('td').toArray();
    // console.log(array[0].text());
    var number = 0;
    var keyword;
    $('td').each(function(i, field){
        console.log('Loop: ' + i);
        console.log('Text: ' + $(this).text());
        for (var k in message){
            //console.log(message[k].keyword);
            if ($(this).text() == message[k].keyword){
                console.log('Found Keyword: ' + message[k].keyword);
                number = i;
                keyword = k;
                break;
            }
        }
        console.log('Number: ' + (number + 1));
        console.log('Key: ' + keyword);
        console.log('Key Value: ' + message[keyword]);
        if (i == number + 1){
            console.log('Hello');
            message[keyword].text = $(this).text();
            console.log('Keyword Value: ' + message.keyword.text);
        }
    });
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
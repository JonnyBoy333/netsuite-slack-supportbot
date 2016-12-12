var express = require('express');
var router = express.Router();
var request = require("request");
var Botkit = require('botkit');
var OAuth   = require('oauth-1.0a');
var controller = Botkit.slackbot({
    // debug: false,
    // logLevel: 7 // verbose logging
});
var bot = controller.spawn({
    send_via_rtm: true,
    token: 'xoxb-15323778418-BRvb2hDVdIcyNwLL0Oi9iju4'
});

bot.startRTM(function(err, bot, payload){
    if (err){
        throw new Error('Could not connect to slack.');
    }
});

//Retrieves the user's name from slack
function getUser (id){
    return new Promise(function(resolve, reject){
        bot.api.users.info({user: id},function(err,response) {
            resolve(response);
            if (err){
                reject(err);
            }
        })
    })
}

var searchTerms = [
    /open cases/i,
    /my cases/i,
    /grab/i,
    /last message/i,
    /escalate/i,
    /help/i,
    /netsuite/i,
    /it going/i,
    /would you like to do/i,
    /close/i,
    /reply/i,
    /reassign/i,
    /hello/i
];

controller.hears(searchTerms,['direct_message','direct_mention','mention'],function(bot,message) {
    bot.startTyping(message);
    console.log(message.match[0]);
    console.log(message.user);
    var foundTerm = message.match[0].toLowerCase();
    //Responses to send to NetSuite
    if (foundTerm === "netsuite" || foundTerm === "open cases" || foundTerm === "my cases" || foundTerm === "grab" || foundTerm === "last message" || foundTerm === "escalate" || foundTerm === "close" || foundTerm === "reply" || foundTerm === "reassign") {
        var postData = {};
        postData.searchTerm = foundTerm;
        postData.message = message.text;
        getUser(message.user)
        .then(function(response){
            postData.user = response.user.real_name;

            //Authentication
            var remoteAccountID = '"3499441"';
            //user token
            var token = {
                public: 'e147942fe6de80b50457bf2128410e1792b548775cb6429afa218aa20a50c6b4',
                secret: 'a10ddd0959e56ec5d0ee85a171f11f0f37b28095e50f9f68192200cf1a7c62e7'
            };

            //app credentials
            var oauth = OAuth({
                consumer: {
                    public: '2656abe35499cf19402a26de2cdb8875264001ab9493f9a22ecf4ee056030a81',
                    secret: 'df267963aeaa4d8d47e6224131496e9595902eb239d87e692e71963dd4789563'
                },
                signature_method: 'HMAC-SHA1'
            });

            var request_data = {
                url: 'https://rest.netsuite.com/app/site/hosting/restlet.nl?script=79&deploy=1',
                method: 'POST'
            };

            var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
            headerWithRealm.Authorization += ', realm=' + remoteAccountID;
            headerWithRealm['content-type'] = 'application/json';
            console.log('Header Authorization: ' + JSON.stringify(headerWithRealm));

            // headers: {
            //     "Content-Type": "application/json",
            //         "Authorization": "NLAuth nlauth_account=3499441,nlauth_email=jlamb@kdv.com,nlauth_signature=8Gf1yfu2a^,nlauth_role=3"
            // }
            request({
                url: request_data.url,
                method: request_data.method,
                headers: headerWithRealm,
                json: postData
            }, function(error, response, body) {
                if (error){
                    console.log(error);
                } else {
                    //console.log(body);
                    if (typeof body == 'string' && body.indexOf('error') === 2){
                        console.log('Error :' + body);
                    } else if (body.message || body.attachments){
                        var simpleMessage = body.message;
                        console.log('Simple Message: ' + simpleMessage);
                        if (body.attachments){
                            var slackAttachment = {
                                "attachments": body.attachments,
                                "username": "support",
                                "icon_emoji": ":support:"
                            };
                            bot.reply(message, '');
                            bot.reply(message,slackAttachment);
                        } else {
                            bot.reply(message,simpleMessage);
                        }
                        //console.log("body: " + JSON.stringify(body));
                        //console.log("Header: " + JSON.stringify(response.headers));
                        //console.log("attachments: " + JSON.stringify(slackAttachment));
                    }
                }
            });
        })
        .catch(function(reason){
            console.log(reason);
        })


        //Used for default responses
    } else {
        bot.startTyping(message);
        var newMessage = '';
        switch (foundTerm) {
            case "hello":
                newMessage = "Hello to you too.";
                break;

            case "it going":
                newMessage = "Not too bad " + message.user + ".";
                break;

            case "would you like to do":
                newMessage = "Let's ride a bike!";
                break;

            case "help":
                newMessage = "Hello, I am the Support Bot and I can help you manage your support cases in NetSuite. " +
                    "To interact with me type \"@support\" followed by one of the phrases below. ```" +
                    "1. [help] Lists all commands available to Support Bot.\n" +
                    "2. [open cases] Lists all open cases.\n" +
                    "3. [my cases] Shows all cases assigned to you.\n" +
                    "4. [grab (case #)] Reassignes a case to you.\n" +
                    "5. [last message (case #)] Shows the last customer message for the specified case.\n" +
                    "6. [escalate (case #) *escalatee*] Escalates the case to the escalatee.\n" +
                    "7. [reassign (case #) *reassignee*] Reassigns the case to the reassignee.\n" +
                    "8. [reply (case #) *message*] Sends a message to the customer for the specified case.\n" +
                    "9. [close (case #)] Closes the specified case.```";
                break;

            default:
                newMessage = "Sorry, I don't know how to answer that. If you need help please type: ```@support: help```";
        }
        bot.reply(message,newMessage);
    }
});


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Jon\'s Awesome Node App' });
});

module.exports = router;
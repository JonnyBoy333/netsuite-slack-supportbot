var express = require('express');
var router = express.Router();
var request = require("request");
var Botkit = require('botkit');
var OAuth = require('oauth-1.0a');
//var SlackModel = require('../models/schemas');
//var newAccount = new SlackModel.teams;
var mongodbStorage = require('../models/mongo_storage')({mongoUri: process.env.MONGODB_URI});

//Create Bot
var controller = Botkit.slackbot({
    clientId: process.env.CONSUMER_KEY,
    clientSecret: process.env.CONSUMER_SECRET,
    storage: mongodbStorage
});


// just a simple way to make sure we don't connect to the RTM twice for the same team
var _bots = {};
function trackBot(bot) {
    _bots[bot.config.token] = bot;
}

controller.on('create_bot',function(bot,config) {

    if (_bots[bot.config.token]) {
        // already online! do nothing.
    } else {
        bot.startRTM(function(err) {

            if (!err) {
                trackBot(bot);
            }

            bot.startPrivateConversation({user: config.createdBy},function(err,convo) {
                if (err) {
                    console.log(err);
                } else {
                    convo.say('I am a bot that has just joined your team');
                    convo.say('You must now /invite me to a channel so that I can be of use!');
                }
            });

        });
    }

});

// controller.storage.teams.all(function(err,teams) {
//
//     if (err) {
//         throw new Error(err);
//     }
//
//     // connect all teams with bots up to slack!
//     for (var t  in teams) {
//         if (teams[t].bot) {
//             controller.spawn(teams[t]).startRTM(function(err, bot) {
//                 if (err) {
//                     console.log('Error connecting bot to Slack:',err);
//                 } else {
//                     trackBot(bot);
//                 }
//             });
//         }
//     }
//
// });

var bot = controller.spawn({
    send_via_rtm: true,
    token: 'xoxb-136554563520-pcICEsmncIBQC2vhBlnKZ6bl'
});

bot.startRTM(function(err, bot, payload){
    if (err){
        throw new Error('Could not connect to slack.');
    }
});

Promise.prototype.thenReturn = function(value) {
    return this.then(function() {
        return value;
    });
};

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
    /unassigned cases/i,
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
    /assign/i,
    /increase priority/i,
    /decrease priority/i,
    /all messages/i,
    /all attachments/i,
    /hello/i
];

controller.hears(searchTerms,['direct_message','direct_mention','mention'],function(bot,message) {
    bot.startTyping(message);
    console.log(message.match[0]);
    console.log(message.user);
    var foundTerm = message.match[0].toLowerCase();
    //Responses to send to NetSuite
    if (foundTerm === "hello" || foundTerm === "it going" || foundTerm === "would you like to" || foundTerm === "help") {
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
                    "3. [unassigned cases] Lists all unassigned cases.\n" +
                    "4. [my cases] Shows all cases assigned to you.\n" +
                    "5. [grab (case #)] Assignes a case to you.\n" +
                    "6. [last message (case #)] Shows the last customer message for the specified case.\n" +
                    "7. [all messages (case #)] Shows all messages for the specified case.\n" +
                    "8. [all attachments (case #)] Shows all attachments for the specified case.\n" +
                    "9. [escalate (case #) *escalatee*] Escalates the case to the escalatee.\n" +
                    "10.[increase/decrease priority (case #)] Increases or decreases the priority of the case.\n" +
                    "11.[assign (case #) *assignee*] Assigns the case to the assignee.\n" +
                    "12.[reply (case #) *message*] Sends a message to the customer for the specified case.\n" +
                    "13.[close (case #)] Closes the specified case.```";
                break;

            default:
                newMessage = "Sorry, I don't know how to answer that. If you need help please type: ```@support: help```";
        }
        bot.reply(message,newMessage);
        //Used for default responses
    } else {
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
                    function sendMessage(i) {
                        return new Promise(function(resolve) {
                            var reply = body[i].attachments ? {attachments: body[i].attachments} : body[i].message;
                            console.log('Reply: ' + JSON.stringify(reply));
                            bot.reply(message, reply, function (err, res) {
                                if (err) {console.log(err)}
                                resolve();
                            });
                            if (i <= (body.length - 1)) {bot.startTyping(message)}
                        })
                    }


                    console.log('Body:', body);
                    if (typeof body == 'string' && body.indexOf('error') === 2){
                        console.log('Error :' + body);
                    } else {
                        // The loop initialization
                        var len = body.length;
                        Promise.resolve(0).then(function loop(i) {
                            // The loop check
                            if (i < len) { // The post iteration increment
                                return sendMessage(i).thenReturn(i + 1).then(loop);
                            }
                        }).then(function() {
                            console.log("All messages sent");
                        }).catch(function(e) {
                            console.log("error", e);
                        });
                    }
                }
            });
        })
        .catch(function(reason){
            console.log(reason);
        })
    }
});


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Jon\'s Awesome Node App' });
});

router.post('/', function(req, res, next) {
    res.send('You just sent: \n' + JSON.stringify(req.body));
});

module.exports = router;
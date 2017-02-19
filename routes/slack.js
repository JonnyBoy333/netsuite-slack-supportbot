var express = require('express');
var router = express.Router();
var request = require("request");
var OAuth = require('oauth-1.0a');
var sanitizeHtml = require('sanitize-html');
var controller = require('../modules/bot_controller');
var trackBot = require('../modules/track_bot').trackBot;
var _bots = require('../modules/track_bot').bots;

controller.storage.teams.all(function(err,teams) {
    if (err) {
        throw new Error(err);
    }

    // connect all teams with bots up to slack!
    for (var t in teams) {
        if (teams[t].bot && teams.hasOwnProperty(t)) {
            controller.spawn(teams[t].bot).startRTM(function(err, bot) {
                if (err) {
                    console.log('Error connecting bot to Slack:', err);
                    //TODO remove team as the likely removed your app
                } else {
                    console.log('Bot connected:', bot.team_info.name);
                    trackBot(bot);
                }
            });
        }
    }
});

Promise.prototype.thenReturn = function(value) {
    return this.then(function() {
        return value;
    });
};

//Retrieves the user's name from slack
function getUser(id, bot) {
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
    'open cases',
    'unassigned cases',
    'my cases',
    'grab',
    'last message',
    'escalate',
    'help',
    'netsuite',
    'it going',
    'would you like to do',
    'close',
    'reply',
    'assign',
    'increase priority',
    'decrease priority',
    'all messages',
    'all attachments',
    'hello',
    'about'
].join('|');

var searchReg = new RegExp(searchTerms, 'gi');

controller.hears([searchReg],['direct_message','direct_mention','mention'],function(bot,message) {
    if (message.user == bot.identity.id) return;

    //Store message data in db
    var messageData = {
        id: message.user,
        $push: {
            messages: {
                keyword: message.match[0],
                message: message.text
            }
        },
        $inc: {
            quantity: 1, "message_count": 1
        }
    };
    controller.storage.users.save(messageData, function (err) {
        if (err) console.log('Error saving message', err)
    });

    //Increment team message count
    var teamCountInc = {
        id: bot.identifyTeam(),
        $inc: {
            quantity: 1, "message_count": 1
        }
    };
    controller.storage.teams.save(teamCountInc, function (err) {
        if (err) console.log('Error saving message', err)
    });


    //console.log('bots', _bots);
    //console.log('Controller Object', controller);
    //console.log('Bot Object', bot);

    bot.startTyping(message);
    console.log('Match', message.match[0]);
    console.log('User', message.user);
    console.log('bot', bot.identity.id);
    console.log('team', bot.identifyTeam());

    var foundTerm = message.match[0].toLowerCase();
    //Responses to send to NetSuite
    if (foundTerm === "hello" || foundTerm === "it going" || foundTerm === "would you like to" || foundTerm === "help" || foundTerm === 'about') {
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

            case "about":
                newMessage = "Netsuite Support Bot `v 1.0`.\n" +
                    "For questions or to report bugs please email us at erpsupport@bergankdv.com";
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
                    //"7. [all messages (case #)] Shows all messages for the specified case.\n" +
                    //"8. [all attachments (case #)] Shows all attachments for the specified case.\n" +
                    "9. [escalate (case #) *escalatee*] Escalates the case to the escalatee.\n" +
                    "10.[increase/decrease priority (case #)] Increases or decreases the priority of the case.\n" +
                    "11.[assign (case #) *assignee*] Assigns the case to the assignee.\n" +
                    "12.[reply (case #) *message*] Sends a message to the customer for the specified case.\n" +
                    "13.[close (case #)] Closes the specified case.\n" +
                    "14.[about] Information about the bot and how to contact us.``` ";
                break;

            default:
                newMessage = "Sorry, I don't know how to answer that. If you need help please type: ```@support: help```";
        }
        bot.reply(message, newMessage);
        //Used for default responses
    } else {
        var postData = {};
        postData.searchTerm = foundTerm;
        postData.message = message.text;
        getUser(message.user, bot)
        .then(function(response){
            var realName = response.user.real_name.replace(/ /g,'').toLowerCase().trim();
            postData.user = response.user.real_name;
            console.log('User Real Name', postData.user);

            //Authentication
            var teamId = bot.identifyTeam();
            console.log('Team ID', teamId);
            controller.storage.teams.get(teamId, function (err, team) {
                if (err) {
                    throw new Error(err);
                }

                console.log('Team', team);
                var remoteAccountID = team.netsuite.account_id;
                console.log('NetSuite Account ID', remoteAccountID);
                var users = team.users;
                console.log('Users', users);

                //Handle error if no users are found
                if (users.length === 0) {
                    bot.reply(message, 'Sorry, I can\'t connect to NetSuite if no users have been setup. Please visit the Slack setup page again in NetSuite and complete the user setup at the bottom of the page.', function (err, res) {
                        if (err) {console.log(err)}
                    });
                    return
                }

                //Loop through users and find the matching one
                for (var i = 0, token = null; i < users.length; i++) {
                    var user = users[i];
                    var userName = user.name.replace(/ /g,'').toLowerCase().trim();
                    if (userName == realName) {
                        //user token
                        token = {
                            public: user.token,
                            secret: user.secret
                        };
                        break;
                    }
                }

                //If no user found use default
                if (!token) {
                    var defaultIndex = users.map(function(user){return user.is_default}).indexOf(true);
                    token = {
                        public: users[defaultIndex].token,
                        secret: users[defaultIndex].secret
                    };
                }


                //app credentials
                var oauth = OAuth({
                    consumer: {
                        public: process.env.NETSUITE_KEY,
                        secret: process.env.NETSUITE_SECRET
                    },
                    signature_method: 'HMAC-SHA1'
                });

                var request_data = {
                    url: team.netsuite.slack_listener_uri,
                    method: 'POST'
                };

                var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
                headerWithRealm.Authorization += ', realm=' + remoteAccountID;
                headerWithRealm['content-type'] = 'application/json';
                console.log('Header Authorization: ' + JSON.stringify(headerWithRealm));

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
                                var reply = body[i].attachments && body[i].attachments.length > 0 ? {attachments: body[i].attachments} : body[i].message;
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
        });
    }
});

//Handle new cases and case replies

//Retrieves the user's ID from slack
function getUserIdList (name, bot, defaultChannel){
    return new Promise(function(resolve, reject){
        var userId;
        if (!name) {
            userId = defaultChannel;
            //userId = '#testing';
            resolve(userId);
        } else {
            bot.api.users.list({},function(err,response) {
                console.log(response);
                for (var i = 0; i < response.members.length; i++){
                    var member = response.members[i];
                    var cleanName = member.real_name.replace(/ /g,'').toLowerCase().trim();
                    if(name == cleanName) {
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

function getAttachments(slackMessages) {
    for (var i = 0, attachments = []; i < slackMessages.length; i++) {
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
        attachments.push(attachment);
    }
    return attachments;
}
//Post new cases
router.post('/newcase', function (req, res, next) {
    var message = req.body;
    console.log('body:', message);
    var slackMessages = message['slack_messages'];
    var teamId = message.team_id;
    var bot = _bots[teamId];
    //console.log('headers: ' + JSON.stringify(req.headers));
    var attachments = getAttachments(slackMessages);
    console.log('Cleaned attachments', attachments);
    var slackAttachment = {};
    controller.storage.teams.get(teamId, function(err, team) {
        if (err) console.log(err);
        var slackAttachment = {
            channel: team.default_channel,
            //channel: '#testing',
            attachments: attachments
        };
        console.log('New Case Slack Attachment:', slackAttachment);
        bot.say(slackAttachment, function(err,res) {
            if (err) {
                console.log('Error sending new case', err);
                slackAttachment.channel = '#general';
                console.log('Slack attachment to send to general channel', slackAttachment);
                bot.say(slackAttachment,function(err,res) {
                    if (err) console.log('Error sending new case to general channel', err);
                })
            }

            //Store the message info
            var teamCountInc = {
                id: teamId,
                $inc: {
                    quantity: 1, "message_count": 1
                }
            };

            controller.storage.teams.save(teamCountInc, function (err) {
                if (err) console.log('Error incrementing team message count', err);
            });

            var channelData = {
                id: team.default_channel,
                $push: {
                    messages: {
                        type: 'newcase',
                        message: slackAttachment.attachments[0].title
                    }
                },
                $inc: {
                    quantity: 1, "message_count": 1
                }
            };
            controller.storage.channels.save(channelData, function (err) {
                if (err) console.log('Error adding message to channel storage', err);
            });
        });
    });
    res.end("NetSuite Listener");
});

//Post case replies
router.post('/casereply', function (req, res, next) {
    var message = req.body;
    console.log('body:', message);
    var slackMessages = message['slack_messages'];
    var teamId = message.team_id;
    var bot = _bots[teamId];
    //console.log('headers: ' + JSON.stringify(req.headers));
    var attachments = getAttachments(slackMessages);
    var slackAttachment = {};
    controller.storage.teams.get(teamId, function(err, team) {
        if (err) console.log(err);
        getUserIdList(message.assigned, bot, team.default_channel)
        .then(function(userId) {
            console.log(userId);
            slackAttachment = {
                attachments: attachments,
                //channel: '#testing',
                channel: userId
            };
            console.log('RTM Slack Attachment:', slackAttachment);
            bot.say(slackAttachment, function(err,res) {
                if (err) {
                    console.log('Error sending new case', err);
                    slackAttachment.channel = '#general';
                    bot.say(slackAttachment,function(err,res) {
                        if (err) console.log('Error sending new case to general channel', err);
                    })
                }

                //Store the message info
                var teamCountInc = {
                    id: teamId,
                    $inc: {
                        quantity: 1, "message_count": 1
                    }
                };

                controller.storage.teams.save(teamCountInc, function (err) {
                    if (err) console.log('Error incrementing team message count', err);
                });

                var channelData = {
                    id: team.default_channel,
                    $push: {
                        messages: {
                            type: 'casereply',
                            message: slackAttachment
                        }
                    },
                    $inc: {
                        quantity: 1, "message_count": 1
                    }
                };
                controller.storage.channels.save(channelData, function (err) {
                    if (err) console.log('Error adding message to channel storage', err);
                });
            });
        })
    });
    res.end("NetSuite Listener");
});

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Slack Bot App' });
});

module.exports = router;
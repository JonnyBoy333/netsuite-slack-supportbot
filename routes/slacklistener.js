var express = require('express'),
    router = express.Router(),
    request = require("request"),
    OAuth = require('oauth-1.0a'),
    sanitizeHtml = require('sanitize-html'),
    controller = require('../modules/bot_controller'),
    trackBot = require('../modules/track_bot').trackBot,
    _bots = require('../modules/track_bot').bots,
    _interactive_bots = require('../modules/track_bot').interacticeBots,
    passport = require('passport'),
    nsStats = require('../modules/netsuite_logging');
    //fs = require('fs');

controller.storage.teams.all(function(err,teams) {
    console.log('Start bot connecting');
    if (err) {
        console.log('Error connecting to bot', err);
        throw new Error(err);
    }

    // connect all teams with bots up to slack!
    for (var t in teams) {
        if (teams[t].bot && teams.hasOwnProperty(t)) {
            controller.spawn(teams[t].bot).startRTM(function(err, bot) {
                if (err) {
                    console.log('Error connecting bot to Slack:', err);
                    //TODO remove team as they likely removed your app
                } else {
                    console.log('Bot connected:', bot.team_info.name);
                    trackBot(bot, 'main');
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

setInterval(function(){
    var date = new Date();
    for (var message in _interactiveMessages) {
        var messageExpiration = _interactiveMessages[message].setSeconds(_interactiveMessages[message].getSeconds() + 10);
        if (date > messageExpiration) delete _interactiveMessages[message];
    }
}, 10000);

//Handle file uploads
controller.on('file_shared', function(bot, message) {
    console.log('File Message', message);
    var teamId = bot.team_info.id,
        interactiveBot = _interactive_bots[teamId];
    var reply = 'Hello';
    interactiveBot.replyInteractive(message, reply);
});

//Handle Interactive Messages
var _interactiveMessages = {};
// receive an interactive message, and reply with a message that will replace the original
controller.on('interactive_message_callback', function(bot, message) {
    trackBot(bot, 'interactive');

    //Check to see if message has already been sent
    if (_interactiveMessages.hasOwnProperty(message.callback_id)) return;

    _interactiveMessages[message.callback_id] = new Date();
    //console.log('Interactive Bot', bot);
    console.log('Button Response Message', message);
    console.log('Original Message Attachments', message.original_message.attachments);
    console.log('Answer value', message.actions[0].value);

    // check message.actions and message.callback_id to see what action to take...
    //bot.startTyping(message);

    if (message.actions[0].value === 'no') {
        bot.replyInteractive(message, {
            text: 'Ok, I will not send your message.'
        });
        delete _interactiveMessages[message.callback_id];
        return;
    }

    var postData = {};
    var originalMessagerAttachment = message.original_message.attachments[0];
    var caseNum = originalMessagerAttachment.title.substring(5, originalMessagerAttachment.title.indexOf(':'));
    postData.message = 'replyconfirmed ' + caseNum + ' ' + originalMessagerAttachment.text;
    console.log('Post Data', postData);
    postData.searchTerm = 'replyconfirmed';
    getUser(message.user, bot)
        .then(function(response){
            var realName = response.user.real_name.replace(/ /g,'').toLowerCase().trim();
            postData.user = response.user.real_name;
            console.log('User Real Name:', postData.user);

            //Authentication
            var teamId = bot.identifyTeam();
            console.log('Team ID', teamId);
            controller.storage.teams.get(teamId, function (err, team) {
                if (err) console.log('Error storing team data', err);

                //console.log('Team', team);
                var remoteAccountID = team.netsuite.account_id;
                console.log('NetSuite Account ID', remoteAccountID);
                var users = team.users;
                console.log('Users', users);

                //Handle error if no users are found
                if (users.length === 0) {
                    bot.replyInteractive(message, 'Sorry, I can\'t connect to NetSuite if no users have been setup. Please visit the Slack setup page again in NetSuite and complete the user setup at the bottom of the page.',
                        function (err) {
                            if (err) console.log(err);
                        }
                    );
                    delete _interactiveMessages[message.callback_id];
                    return
                }

                //Loop through users and find the matching one
                for (var i = 0, token = null; i < users.length; i++) {
                    var user = users[i];
                    var userName = user.name.replace(/ /g,'').toLowerCase().trim();
                    console.log('Username : Real Name', userName + ' : ' + realName);
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
                        bot.replyInteractive(message, 'There was an error connecting to NetSuite, please try again.');
                        delete _interactiveMessages[message.callback_id];
                    } else {
                        // function sendMessage(i) {
                        //     return new Promise(function(resolve) {
                        //         if (body[i].needsCleaning === true) {
                        //             var dirtyMessage = body[i].message;
                        //             if (dirtyMessage) {
                        //                 var cleanMessage = sanitizeHtml(dirtyMessage, {
                        //                     allowedTags: [],
                        //                     allowedAttributes: []
                        //                 });
                        //                 //console.log('Clean message: ' + cleanMessage);
                        //                 var trimmedMessage = cleanMessage.trim();
                        //                 var removeBlanks = /[\r\n]{2,}/g;
                        //                 var noBlankLinesMessage = trimmedMessage.replace(removeBlanks, '\r\n');
                        //                 //console.log('No Blanks: ' + noBlankLinesMessage);
                        //                 body[i].message = noBlankLinesMessage;
                        //             }
                        //         }
                        //         var reply = body[i].attachments && body[i].attachments.length > 0 ? {attachments: body[i].attachments} : body[i].message;
                        //         console.log('Reply: ' + JSON.stringify(reply));
                        //         bot.replyInteractive(message, reply);
                        //         resolve();
                        //         if (i <= (body.length - 1)) {bot.startTyping(message)}
                        //     })
                        // }


                        //console.log('Body:', body);
                        if ((typeof body == 'string' && body.indexOf('error') === 2) || (body.hasOwnProperty('type') && body.type.indexOf('error'))){
                            console.log('Error :' + body);
                            bot.replyInteractive(message, 'There was an error sending your message, please try again.');
                            delete _interactiveMessages[message.callback_id];

                        } else {
                            var reply = { attachments: body[0].attachments };
                            console.log('Reply: ' + JSON.stringify(reply));
                            bot.replyInteractive(message, reply);
                            delete _interactiveMessages[message.callback_id];

                            // // The loop initialization
                            // var len = body.length;
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
                        }
                    }
                });
            })
                .catch(function(reason){
                    console.log(reason);
                })
        });
});

var searchTerms = [
    'open cases',
    'unassigned cases',
    'my cases',
    'grab',
    'last message',
    'all messages',
    'all attachments',
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
    'about',
    'interactive'
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
        },
        active: true
    };
    controller.storage.users.save(messageData, function (err, message) {
        if (err) console.log('Error saving message', err);
        //console.log('User Message : ', message);
        //send to netsuite
        message.type = 'user';
        messageData.$push.messages.date = new Date();
        message.messages = [messageData.$push.messages];
        nsStats(message);
    });

    //Increment team message count
    var teamCountInc = {
        id: bot.identifyTeam(),
        $inc: {
            quantity: 1, "message_count": 1
        },
        active: true
    };
    controller.storage.teams.save(teamCountInc, function (err, message) {
        if (err) console.log('Error saving message', err);
        //console.log('Team message', message);
        message.type = 'team';
        nsStats(message);
    });


    //console.log('bots', _bots);
    //console.log('Controller Object', controller);
    //console.log('Listening Bot', bot);
    bot.startTyping(message);
    console.log('Match', message.match[0]);
    console.log('User', message.user);
    console.log('bot', bot.identity.id);
    console.log('team', bot.identifyTeam());

    var foundTerm = message.match[0].toLowerCase();

    //Testing interactions
    if (foundTerm === 'interactive') {
        bot.reply(message, {
            attachments:[
                {
                    title: 'Do you want to interact with my buttons?',
                    callback_id: '123',
                    attachment_type: 'default',
                    actions: [
                        {
                            "name":"yes",
                            "text": "Yes",
                            "style": "primary",
                            "value": "yes",
                            "type": "button"
                        },
                        {
                            "name":"no",
                            "text": "No",
                            "style": "danger",
                            "value": "no",
                            "type": "button"
                        }
                    ]
                }
            ]
        });
        console.log('Message', message);
        return;
    }


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
                newMessage = "Netsuite Support Bot `v0.1 beta`.\n" +
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
                    "7. [all messages (case #)] Shows all messages for the specified case.\n" +
                    "8. [all attachments (case #)] Shows all attachments for the specified case.\n" +
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
        postData.id = message.ts;
        getUser(message.user, bot)
        .then(function(response){
            var realName = response.user.real_name.replace(/ /g,'').toLowerCase().trim();
            postData.user = response.user.real_name;
            console.log('User Real Name:', postData.user);

            //Authentication
            var teamId = bot.identifyTeam();
            console.log('Team ID', teamId);
            controller.storage.teams.get(teamId, function (err, team) {
                if (err) console.log('Error storing team data', err);

                //console.log('Team', team);
                var remoteAccountID = team.netsuite.account_id;
                console.log('NetSuite Account ID', remoteAccountID);
                var users = team.users;
                console.log('Users', users);

                //Handle error if no users are found
                if (users.length === 0) {
                    bot.reply(message, 'Sorry, I can\'t connect to NetSuite if no users have been setup. Please visit the Slack setup page again in NetSuite and complete the user setup at the bottom of the page.',
                        function (err) {
                            if (err) console.log(err);
                        }
                    );
                    return
                }

                //Loop through users and find the matching one
                for (var i = 0, token = null; i < users.length; i++) {
                    var user = users[i];
                    var userName = user.name.replace(/ /g,'').toLowerCase().trim();
                    console.log('Username : Real Name', userName + ' : ' + realName);
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
                                if (body[i].needsCleaning === true) {
                                    function byteCount(str) {
                                        var s = str.length;
                                        for (var i=str.length-1; i>=0; i--) {
                                            var code = str.charCodeAt(i);
                                            if (code > 0x7f && code <= 0x7ff) s++;
                                            else if (code > 0x7ff && code <= 0xffff) s+=2;
                                            if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
                                        }
                                        return s;
                                    }
                                    //console.log('Body Before Cleaning', body[i]);
                                    var dirtyMessage = body[i].message;
                                    //console.log('Dirty Message', dirtyMessage);
                                    var intro = body[i].keyword === 'last message' ? dirtyMessage.substr(0, dirtyMessage.indexOf('is:') + 3) : dirtyMessage.substr(0, dirtyMessage.indexOf('sent the following message:') + 27);
                                    console.log('Intro', intro);
                                    var html = body[i].keyword === 'last message' ? dirtyMessage.substr(dirtyMessage.indexOf('is:') + 3) : dirtyMessage.substr(dirtyMessage.indexOf('sent the following message:') + 27);
                                    if (html) {

                                        function cutInUTF8(str, n) {
                                            var len = Math.min(n, str.length);
                                            var i, cs, c = 0, bytes = 0;
                                            for (i = 0; i < len; i++) {
                                                c = str.charCodeAt(i);
                                                cs = 1;
                                                if (c >= 128) cs++;
                                                if (c >= 2048) cs++;
                                                if (n < (bytes += cs)) break;
                                            }
                                            return str.substr(0, i);
                                        }

                                        var cleanMessage = sanitizeHtml(html, {
                                            allowedTags: [],
                                            allowedAttributes: []
                                        });
                                        //console.log('Clean message: ' + cleanMessage);
                                        var trimmedMessage = cleanMessage.trim();
                                        var removeBlanks = /[\r\n]{2,}/g;
                                        var noBlankLinesMessage = trimmedMessage.replace(removeBlanks, '\r\n');
                                        console.log('i', i);
                                        //console.log('No Blanks: ' + noBlankLinesMessage);
                                        //console.log('No Blanks and Intro Length', intro.length + 3 + noBlankLinesMessage.substr(0, 3980 - intro.length).length + 13);
                                        console.log('Byte Length', byteCount(noBlankLinesMessage + intro) + 16);
                                        if (byteCount(noBlankLinesMessage + intro) + 16 > 3800) {
                                            var introBytes = byteCount(intro);
                                            console.log('Slim Bite Length', byteCount(cutInUTF8(noBlankLinesMessage, 3800 - introBytes - 16)));
                                            body[i].message = intro + '```' + cutInUTF8(noBlankLinesMessage, 3800 - introBytes - 16) + ' (more)...```';
                                        } else {
                                            body[i].message = intro + '```' + noBlankLinesMessage + '```';
                                        }
                                    }
                                }
                                var reply = body[i].attachments && body[i].attachments.length > 0 ? {attachments: body[i].attachments} : body[i].message;
                                console.log('Reply: ' + JSON.stringify(reply));
                                // fs.writeFile("reply.txt", reply, function(err) {
                                //     if(err) {
                                //         return console.log(err);
                                //     }
                                //     console.log("The file was saved!");
                                // });
                                bot.reply(message, reply, function (err) {
                                    if (err) console.log(err);
                                    resolve();
                                });
                                if (i <= (body.length - 1)) {bot.startTyping(message)}
                            })
                        }


                        //console.log('Body:', body);
                        if (typeof body == 'string' && body.indexOf('error') === 2){
                            console.log('Error :' + body);
                        } else {
                            console.log('Full Body', body);
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
    name = name.replace(/ /g,'').toLowerCase().trim();
    return new Promise(function(resolve, reject){
        var userId = defaultChannel;
        if (!name) {
            //userId = '#testing';
            resolve(userId);
        } else {
            bot.api.users.list({},function(err,response) {
                //console.log(response);
                for (var i = 0; i < response.members.length; i++){
                    var member = response.members[i];
                    var cleanName = member.profile.real_name.replace(/ /g,'').toLowerCase().trim();
                    if(name == cleanName) {
                        console.log('Name : Slack Name', name + ' : ' + cleanName);
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

function storeMessageData(teamId, team, type, slackAttachment) {
    //Store the message info
    var teamCountInc = {
        id: teamId,
        $inc: {
            quantity: 1, "message_count": 1
        },
        active: true
    };

    controller.storage.teams.save(teamCountInc, function (err, message) {
        if (err) console.log('Error incrementing team message count', err);
        message.type = 'team';
        nsStats(message);
    });

    var channelData = {
        id: team.default_channel,
        $push: {
            messages: {
                message_type: type,
                message: slackAttachment.attachments[0].title
            }
        },
        $inc: {
            quantity: 1, "message_count": 1
        },
        active: true
    };

    controller.storage.channels.save(channelData, function (err, message) {
        if (err) console.log('Error adding message to channel storage', err);
        message.type = 'channel';
        channelData.$push.messages.date = new Date();
        message.messages = [channelData.$push.messages];
        console.log('Channel message', message);
        nsStats(message);
    });
}

router.use(passport.authenticate('bearer', { session: false }));
//Post new cases
router.post('/newcase',
    passport.authenticate('bearer', { session: false }),
    function (req, res) {
    var message = req.body,
        slackMessages = message['slack_messages'],
        teamId = message.team_id,
        bot = _bots[teamId],
        attachments = getAttachments(slackMessages),
        slackAttachment = {};
    console.log('body:', message);
    console.log('TeamID:', teamId);
    console.log('Bot:', bot);
    console.log('Cleaned attachments:', attachments);
    //console.log('headers: ' + JSON.stringify(req.headers));
    controller.storage.teams.get(teamId, function(err, team) {
        if (err) console.log(err);
        slackAttachment = {
            channel: team.default_channel,
            //channel: '#testing',
            attachments: attachments
        };
        console.log('New Case Slack Attachment:', slackAttachment);
        bot.say(slackAttachment, function(err) {
            if (err) {
                console.log('Error sending new case', err);
                // slackAttachment.channel = '#general';
                // console.log('Slack attachment to send to general channel', slackAttachment);
                // bot.say(slackAttachment,function(err) {
                //     if (err) console.log('Error sending new case to general channel', err);
                // })
            }
            storeMessageData(teamId, team, 'newcase', slackAttachment);
        });
    });
    res.end("NetSuite Listener");
});

//Post case replies
router.post('/casereply',
    passport.authenticate('bearer', { session: false }),
    function (req, res) {
        var message = req.body,
            slackMessages = message['slack_messages'],
            teamId = message.team_id,
            bot = _bots[teamId],
            attachments = getAttachments(slackMessages),
            slackAttachment = {};
        //console.log('body:', message);
        //console.log('headers: ' + JSON.stringify(req.headers));
        controller.storage.teams.get(teamId, function(err, team) {
            if (err) console.log(err);
            getUserIdList(message.assigned, bot, team.default_channel)
            .then(function(userId) {
                console.log('User ID', userId);
                slackAttachment = {
                    attachments: attachments,
                    //channel: '#testing',
                    channel: userId
                };
                console.log('RTM Slack Attachment:', slackAttachment);
                bot.say(slackAttachment, function(err) {
                    if (err) {
                        console.log('Error sending case reply', err);
                        // slackAttachment.channel = '#general';
                        // bot.say(slackAttachment,function(err) {
                        //     if (err) console.log('Error sending new case to general channel', err);
                        // })
                    }
                    storeMessageData(teamId, team, 'casereply', slackAttachment);
                });
            })
        });
        res.end("NetSuite Listener");
    }
);

//Post case assignments
router.post('/caseassigned',
    passport.authenticate('bearer', { session: false }),
    function (req, res) {
        var message = req.body,
            slackMessages = message['slack_messages'],
            teamId = message.team_id,
            bot = _bots[teamId],
            attachments = getAttachments(slackMessages),
            slackAttachment = {};
        //console.log('body:', message);
        //console.log('headers: ' + JSON.stringify(req.headers));
        controller.storage.teams.get(teamId, function(err, team) {
            if (err) console.log(err);
            getUserIdList(message.assigned, bot)
                .then(function(userId) {
                    console.log('User ID', userId);
                    if (!userId) {
                        console.log('User not found for case assignment');
                        return;
                    }
                    slackAttachment = {
                        attachments: attachments,
                        //channel: '#testing',
                        channel: userId
                    };
                    console.log('RTM Slack Attachment:', slackAttachment);
                    bot.say(slackAttachment, function(err) {
                        if (err) {
                            console.log('Error sending case reply', err);
                            // slackAttachment.channel = '#general';
                            // bot.say(slackAttachment,function(err) {
                            //     if (err) console.log('Error sending new case to general channel', err);
                            // })
                        }
                        storeMessageData(teamId, team, 'caseassigned', slackAttachment);
                    });
                })
        });
        res.end("NetSuite Listener");
    }
);

/* GET home page. */
router.get('/',
    passport.authenticate('bearer', { session: false }),
    function(req, res, next) {
    res.render('index', { title: 'Slack Bot App' });
});


module.exports = router;
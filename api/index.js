var express  = require('express'),
    router = express.Router(),
    teamModel = require('../models/schemas').teams,
    channelModel = require('../models/schemas').channels,
    controller = require('../modules/bot_controller'),
    _bots = require('../modules/track_bot').bots;

//Add a new account
router.post('/addaccount/:accountid', function(req, res) {
    var accountId = req.params.accountid;
    console.log('New account id', accountId);
    //console.log(req.body);
    if (accountId && req.body.token && req.body.bot.token) {
        var newUserName = '';
        var newAccount = new teamModel;
        newAccount.id = accountId;
        if (req.body.default_channel_id) newAccount.default_channel = req.body.default_channel_id;
        if (req.body.netsuite) newAccount.netsuite = {
            slack_listener_uri: req.body.netsuite.slack_listener_uri,
            account_id: req.body.netsuite.account_id
        };
        if (req.body.token) newAccount.token = req.body.token;
        if (req.body.bot) newAccount.bot = { token: req.body.bot.token };
        if (req.body.users) newAccount.users = req.body.users;
        if (req.body.user) newUserName = req.body.user.replace(/ /g,'').toLowerCase().trim();
        console.log('New Account', newAccount);

        newAccount.save()
        .then(function(savedObject) {
            controller.spawn(savedObject.bot).startRTM(function(err, bot) {
                if (err) {
                    console.log('Error connecting bot to Slack:', err);
                } else {
                    console.log('Bot added for first time:', bot.team_info.name);


                    //Get the account information and save to db
                    function getAccountInfo(bot) {
                        return new Promise(function(resolve, reject){
                            bot.api.team.info({},function(err,response) {
                                //console.log('Team Info', response);

                                var accountInfo = response.team;
                                controller.storage.teams.save(accountInfo, function (err, account) {
                                    if (err) console.log('Error updating team info', err);
                                    res.send(account);
                                });
                                resolve();
                                if (err){
                                    reject(err);
                                }
                            })
                        })
                    }


                    //Get the user list and save to db
                    function getUserIdList(bot) {
                        var userId = '';
                        return new Promise(function(resolve, reject){
                            bot.api.users.list({},function(err,response) {
                                console.log('User List', response);
                                var members = response.members;
                                for (var i = 0; i < members.length; i++){
                                    var firstName = members[i].profile.first_name ? members[i].profile.first_name : '';
                                    var lastName = members[i].profile.last_name ? members[i].profile.last_name : '';
                                    var existingUserName = firstName + lastName;
                                    existingUserName = existingUserName.replace(/ /g,'').toLowerCase().trim();
                                    //console.log('Existing User Name', existingUserName);
                                    if (newUserName == existingUserName) {
                                        userId = members[i].id;
                                    }
                                    if (existingUserName.indexOf('bot') === -1) {
                                        controller.storage.users.save(members[i], function (err) {
                                            if (err) console.log('Error saving user to db', err);
                                        });
                                    }
                                }
                                resolve(userId);
                                if (err){
                                    reject(err);
                                }
                            })
                        })
                    }
                    getAccountInfo(bot).catch(function(e){console.log("error", e)});
                    getUserIdList(bot)
                    .then(function (userId) {
                        console.log('Found User ID', userId);

                        //Send a message to the new account
                        if (newUserName) {
                            function sendMessage (message) {
                                return new Promise (function (resolve, reject) {
                                    resolve(bot.say(message));
                                })
                            }

                            //If the user is found send them an intro message, otherwise send the message to the general channel
                            if (userId) {
                                // bot.startPrivateConversation({user: userId},function(err,convo) {
                                //     if (err) {
                                //         console.log(err);
                                //     } else {
                                //         convo.say('Hello and thank you for adding NetSuite Support Bot to your team!');
                                //         convo.say('Please make sure you finish the setup inside of NetSuite so that I can be of use.');
                                //         convo.say('Then, invite me to your support channel using /invite so that I can help everyone :smiley:.');
                                //     }
                                // });
                                var message1 = { channel: userId, text: 'Hello and thank you for adding NetSuite Support Bot to your team!' },
                                    message2 = { channel: userId, text: 'Please make sure you finish the setup inside of NetSuite so that I can be of use.' },
                                    message3 = { channel: userId, text: 'Then, invite me to your support channel using /invite so that I can help everyone :smiley:.' };
                                // var promise = new Promise(function(resolve, reject) {
                                //     resolve(bot.say(message1));
                                // });
                                // promise.then(function () {return bot.say(message2)});
                                // promise.then(function () {return bot.say(message3)});
                                sendMessage(message1)
                                    .then(sendMessage(message2))
                                    .then(sendMessage(message3))
                                    .catch(function (err) {console.log(err)});
                            } else {
                                var message = { channel: '#general', text: 'Hello and thank you for adding NetSuite Support Bot to your team!' };
                                bot.say(message);
                                message = { channel: '#general', text: 'Please make sure you finish the setup inside of NetSuite so that I can be of use.' };
                                bot.say(message);
                                message = { channel: '#general', text: 'Then, invite me to your support channel using /invite so that I can help everyone :smiley:.' };
                                bot.say(message);
                            }
                        }
                    })
                    .catch(function(e) {
                        console.log("error", e);
                    });
                }
            });
        })
        .catch(function(err) {
            console.log('Error adding a new account', err);
            if (err.code === 11000) res.status(500).send('Account already added');
            else res.status(500).send(err);
        })
    } else {
        res.status(500).send();
    }
});

//Add or update users in an account
router.put('/updateaccount/:accountid', function(req, res) {
    var accountId = req.params.accountid;
    console.log(accountId);
    console.log(req.body);
    if (accountId && req.body.users && req.body.default_channel_id) {

        //Add users to the team and update default channel
        var userArray = req.body.users,
            update = {
                $set : { 'users' : userArray, 'default_channel': req.body.default_channel_id }
            },
            search = {
                id: accountId
            },
            options = {
                new: true
            };

        teamModel.findOneAndUpdate(search, update, options).exec()
            .then(function (updatedAccount) {
                res.status(200).send(updatedAccount);
            })
            .catch(function(err) {
                console.log(err);
                res.status(404).send(err);
            });

        //Create a new channel
        var channelData = {
            id: req.body.default_channel_id,
            team_id: accountId,
            name: req.body.default_channel_name
        };
        controller.storage.channels.save(channelData, function (err) {
            if (err) console.log('Error saving channel data', err)
        });

    } else {
        res.status(500).send();
    }
});

//Delete an account
router.delete('/delete/:accountid', function (req, res) {
    var accountId = req.params.accountid;
    if (accountId) {
        teamModel.findOneAndRemove({ id: accountId }, function (err) {
            if (err) {
                console.log(err);
                res.status(500).send(err);
            } else {
                res.status(200).send(accountId + ' successfully deleted.');
                var bot = _bots[accountId];
                bot.destroy(function(err) {
                    console.log('Error destroying bot', err);
                })
            }
        })
    }
});

router.get('/', function(req, res, next) {
    res.render('index', { title: 'You\'ve reached the Support Bot api interface' });
});

module.exports = router;
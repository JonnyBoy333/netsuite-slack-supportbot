var express  = require('express'),
    router = express.Router(),
    SlackModel = require('../models/schemas').teams,
    controller = require('../modules/bot_controller'),
    _bots = require('../modules/track_bot').bots;

//Add a new account
router.post('/addaccount/:accountid', function(req, res) {
    var accountId = req.params.accountid;
    console.log('New account id', accountId);
    //console.log(req.body);
    if (accountId && req.body.token && req.body.bot.token) {
        var newUserName = '';
        var newAccount = new SlackModel;
        newAccount.id = accountId;
        if (req.body.default_channel) newAccount.default_channel = req.body.default_channel;
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
            res.send(savedObject);
            controller.spawn(savedObject.bot).startRTM(function(err, bot) {
                if (err) {
                    console.log('Error connecting bot to Slack:', err);
                } else {
                    console.log('Bot added for first time:', bot.team_info.name);

                    //Get the user list and save to db
                    function getUserIdList (bot){
                        return new Promise(function(resolve, reject){
                            bot.api.users.list({},function(err,response) {
                                console.log(response);
                                var members = response.members;
                                for (var i = 0; i < members.length; i++){
                                    controller.storage.users.save(members[i], function (err) {
                                        if (err) console.log('Error saving user to db', err);
                                    })
                                }
                                resolve();
                                if (err){
                                    reject(err);
                                }
                            })
                        })
                    }

                    getUserIdList(bot)
                    .then(function () {
                        if (newUserName) {

                            //Find the user from storage
                            var userId = '';
                            controller.storage.users.all(function (err, users) {
                                if (err) console.log ('Could not find user', err);
                                for (var i = 0; i < users.length; i++) {
                                    var existingUserName = users[i].profile.first_name + users[i].profile.last_name;
                                    existingUserName = existingUserName.replace(/ /g,'').toLowerCase().trim();
                                    if (newUserName == existingUserName) {
                                        userId = users[i].id;
                                    }
                                }
                            });

                            //If the user is found send them an intro message, otherwise send the message to the general channel
                            if (userId) {
                                bot.startPrivateConversation({user: userId},function(err,convo) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        convo.say('Hello and thank you for adding NetSuite Support Bot to your team!');
                                        convo.say('Please make sure you finish the setup inside of NetSuite so that I can be of use.');
                                        convo.say('Then, invite me to your support channel using /invite so that I can help everyone :smiley:.');
                                    }
                                });
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
            console.log(err);
            res.status(500).send(err);
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
    if (accountId && req.body.users && req.body.default_channel) {
        var userArray = req.body.users,
            update = {
                $set : { 'users' : userArray, 'default_channel': req.body.default_channel }
            },
            search = {
                id: accountId
            },
            options = {
                new: true
            };

        SlackModel.findOneAndUpdate(search, update, options).exec()
            .then(function (updatedAccount) {
                res.status(200).send(updatedAccount);
            })
            .catch(function(err) {
                console.log(err);
                res.status(404).send(err);
            })
    } else {
        res.status(500).send();
    }
});

//Delete an account
router.delete('/delete/:accountid', function (req, res) {
    var accountId = req.params.accountid;
    if (accountId) {
        SlackModel.findOneAndRemove({ id: accountId }, function (err) {
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

module.exports = router;
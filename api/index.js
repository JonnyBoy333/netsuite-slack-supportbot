var express  = require('express'),
    router = express.Router(),
    teamModel = require('../models/schemas').teams,
    channelModel = require('../models/schemas').channels,
    userModel = require('../models/schemas').users,
    controller = require('../modules/bot_controller'),
    crypto = require('crypto'),
    trackBot = require('../modules/track_bot').trackBot,
    _bots = require('../modules/track_bot').bots,
    tokenSchema = require('../models/schemas').tokens,
    passport = require('passport'),
    nsStats = require('../modules/netsuite_logging');

// //Lookup General Channel
// function lookupGeneralChan(bot) {
//     return new Promise(function(resolve, reject) {
//         bot.api.channels.list({}, function (err, response) {
//             if (err) console.log('Error looking up channels', err);
//             console.log('Channel List', response);
//             if (response.ok === true) {
//                 for (var i = 0; i < response.channels.length; i++) {
//                     var channel = response.channels[i];
//                     if (channel.name === 'random') resolve(channel.id);
//                 }
//             }
//             reject('No general channel found.');
//         })
//     })
// }


//Add a new account
router.post('/addaccount/:accountid',
    passport.authenticate('bearer', { session: false }),
    function(req, res) {
    var accountId = req.params.accountid;
    console.log('New account id', accountId);
    //console.log(req.body);
    if (accountId && req.body.token && req.body.bot.token) {
        var newUserName = '';
        //var newAccount = new teamModel;
        var newAccount = {};
        newAccount.id = accountId;
        if (req.body.default_channel_id) newAccount.default_channel = req.body.default_channel_id;
        if (req.body.netsuite) newAccount.netsuite = {
            slack_listener_uri: req.body.netsuite.slack_listener_uri,
            account_id: req.body.netsuite.account_id,
            environment: req.body.netsuite.environment
        };
        if (req.body.token) newAccount.token = req.body.token;
        if (req.body.bot.token) newAccount.bot = { token: req.body.bot.token };
        if (req.body.users) newAccount.users = req.body.users;
        if (req.body.user) newUserName = req.body.user.replace(/ /g,'').toLowerCase().trim();
        if (req.body.website) newAccount.website = req.body.website;
        if (req.body.ein) newAccount.ein = req.body.ein;
        if (req.body.taxid) newAccount.taxid = req.body.taxid;
        if (req.body.email) newAccount.email = req.body.email;
        if (req.body.logo_url) newAccount.logo_url = req.body.logo_url;
        newAccount.address = {};
        if (req.body.addr1) newAccount.address.addr1 = req.body.addr1;
        if (req.body.addr2) newAccount.address.addr2 = req.body.addr2;
        if (req.body.city) newAccount.address.city = req.body.city;
        if (req.body.state) newAccount.address.state = req.body.state;
        if (req.body.country) newAccount.address.country = req.body.country;
        if (req.body.zip) newAccount.address.zip = req.body.zip;
        newAccount.active = true;
        console.log('New Account', newAccount);

        controller.storage.teams.save(newAccount, function (err, newAccount) {
            if (err) {
                console.log('Error saving message', err);
                return;
            }
            console.log('New Account', newAccount);
            controller.spawn(newAccount.bot).startRTM(function(err, bot) {
                if (err) {
                    console.log('Error connecting bot to Slack:', err);
                    //bot.closeRTM();
                } else {
                    console.log('Bot added for first time:', bot.team_info.name);
                    trackBot(bot, 'main');

                    //Get the account information and save to db
                    function getAccountInfo(bot) {
                        return new Promise(function(resolve, reject){
                            bot.api.team.info({},function(err,response) {
                                //console.log('Team Info', response);

                                var accountInfo = response.team;
                                accountInfo.active = true;
                                controller.storage.teams.save(accountInfo, function (err, account) {
                                    if (err) console.log('Error updating team info', err);
                                    res.send(account);
                                    account.type = 'team';
                                    nsStats(account);
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
                                //console.log('User List', response);
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
                                        console.log('Member', members[i]);
                                        controller.storage.users.save(members[i], function (err, user) {
                                            if (err) console.log('Error saving user to db', err);
                                            user.type = 'user';
                                            nsStats(user);
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

                                //If the user is found send them an intro message, otherwise send the message to the general channel
                                if (userId) {
                                    var message = {
                                        channel: userId,
                                        text: 'Hello and thank you for adding NetSuite Support Bot to your team!\n' +
                                        'Please make sure you finish the setup inside of NetSuite so that I can be of use.\n' +
                                        'Then, invite me to your support channel using /invite so that I can help everyone :smiley:.'
                                    };
                                    bot.say(message);
                                } else {
                                    // var message = {
                                    //     channel: lookupGeneralChan(bot),
                                    //     text: 'Hello and thank you for adding NetSuite Support Bot to your team!\n' +
                                    //     'Please make sure you finish the setup inside of NetSuite so that I can be of use.\n' +
                                    //     'Then, invite me to your support channel using /invite so that I can help everyone :smiley:.'
                                    // };
                                    // bot.say(message);
                                    console.log('Could not send welcome message because user does not exist.')
                                }
                            }
                        })
                        .catch(function(e) {
                            console.log("error", e);
                        });
                }
            });
        });
        // newAccount.save()
        // .then(function(savedObject) {
        //
        // })
        // .catch(function(err) {
        //     console.log('Error adding a new account', err);
        //     if (err.code === 11000) {
        //         res.status(500).send('Account already added');
        //         //TODO reinstantiate bot
        //     }
        //     else res.status(500).send(err);
        // })
    } else {
        res.status(500).send();
    }
});

//Add or update users in an account
router.put('/updateaccount/:accountid',
    passport.authenticate('bearer', { session: false }),
    function(req, res) {
    var accountId = req.params.accountid;
    console.log(accountId);
    console.log(req.body);
    if (accountId && req.body.users && req.body.default_channel_id) {

        //Add users to the team and update default channel
        var userArray = req.body.users,
            update = {
                $set : {
                    'users' : userArray,
                    'default_channel': req.body.default_channel_id
                }
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
                updatedAccount.type = 'user';
                nsStats(updatedAccount);
            })
            .catch(function(err) {
                console.log(err);
                res.status(404).send(err);
            });

        //Create a new channel
        var channelData = {
            id: req.body.default_channel_id,
            team_id: accountId,
            name: req.body.default_channel_name,
            active: true
        };
        controller.storage.channels.save(channelData, function (err, channel) {
            if (err) console.log('Error saving channel data', err);
            channel.type = 'channel';
            nsStats(channel);
        });

    } else {
        res.status(500).send();
    }
});

//Check to see if active account
router.get('/activate/:accountid',
    passport.authenticate('bearer', { session: false }),
    function(req, res) {
        var accountId = req.params.accountid;
        console.log('Account ID', accountId);
        if (accountId) {

            //Activate the account
            var update = { $set : { 'active' : true } },
            search = { "netsuite.account_id": accountId },
            options = { new: true };

            teamModel.findOneAndUpdate(search, update, options).exec()
                .then(function (updatedAccount) {
                    console.log('Updated Account', updatedAccount);

                    if (updatedAccount) {
                        //Update active status in NetSuite logs
                        updatedAccount.type = 'team';
                        nsStats(updatedAccount);
                        res.status(200).send({
                            team_id: updatedAccount.id,
                            default_channel: updatedAccount.default_channel,
                            slack_token: updatedAccount.token,
                            slack_bot_token: updatedAccount.bot.token
                        });

                        //Spawn bot
                        controller.spawn(updatedAccount.bot).startRTM(function(err, bot) {
                            if (err) {
                                console.log('Error connecting bot to Slack:', err); //bot probably already spawned
                            } else {
                                console.log('Bot re activated:', bot.team_info.name);
                                trackBot(bot, 'main');
                            }
                        });

                        //Activate the channels
                        search = { team_id : accountId };
                        channelModel.updateMany(search, update).exec()
                            .then(function (channel) {
                                channel.type = 'channel';
                                nsStats(channel);
                            })
                            .catch(function (err) {
                                if (err) {
                                    console.log('Error activating channels', err);
                                    res.status(500).send(err);
                                }
                            });

                        //Activate the users
                        userModel.updateMany(search, update).exec()
                            .then(function (users) {
                                users.type = 'user';
                                nsStats(users);
                            })
                            .catch(function (err) {
                                if (err) {
                                    console.log('Error activating users', err);
                                    res.status(500).send(err);
                                }
                            });
                    } else {
                        res.status(200).send();
                    }
                })
                .catch(function(err) {
                    console.log(err);
                    res.status(404).send(err);
                });

        } else {
            res.status(500).send();
        }
    });

//Delete an account
router.delete('/delete/:accountid', function (req, res) {
    if (req.headers.authorization === 'Bearer ' + process.env.ACCESS_TOKEN) {
        var accountId = req.params.accountid;

        //Destroy the token
        //var token = req.headers.authorization.substr(8);
        var token = req.query.token;
        console.log('Token being deleted', token);
        tokenSchema.findOneAndRemove({'token': token}, function (err) {
            if (err) console.log('Error deleting token', err);
        });

        if (accountId) {
            //Deactivate the team
            var update = {$set: {'active': false}},
                search = {id: accountId},
                options = {new: true};
            teamModel.findOneAndUpdate(search, update, options).exec()
                .then(function (team) {
                    team.type = 'team';
                    nsStats(team);
                })
                .catch(function (err) {
                    if (err) {
                        console.log('Error deactivating team', err);
                        res.status(500).send(err);
                    }
                });

            //Deactivate the channels
            search = {team_id: accountId};
            channelModel.updateMany(search, update).exec()
                .then(function (channel) {
                    channel.type = 'channel';
                    nsStats(channel);
                })
                .catch(function (err) {
                    if (err) {
                        console.log('Error deactivating channels', err);
                        res.status(500).send(err);
                    }
                });

            //Deactivate the users
            userModel.updateMany(search, update).exec()
                .then(function (users) {
                    users.type = 'user';
                    nsStats(users);
                })
                .catch(function (err) {
                    if (err) {
                        console.log('Error deactivating users', err);
                        res.status(500).send(err);
                    }
                });

            //Send response and destroy the activate bot
            res.status(200).send(accountId + ' successfully deleted.');
            var bot = _bots[accountId];
            if (bot) {
                bot.destroy(function (err) {
                    console.log('Error destroying bot', err);
                });
                delete _bots[accountId];
            }
        }
    } else {
        res.status(401).send('Not Authorized');
    }
});

router.post('/generate-token', function(req, res){
    if (req.headers.authorization === 'Bearer ' + process.env.ACCESS_TOKEN) {
        var token = crypto.randomBytes(64).toString('hex');
        console.log('Generated token: ', token);
        var tokenModel = new tokenSchema;
        tokenModel.token = token;
        tokenModel.account_id = req.body.account_id;
        tokenModel.account_name = req.body.account_name;
        tokenModel.save()
        .then(function(team){
            res.status(200).send({ token: token });
        })
        .catch(function(err){
            console.log('Error saving token', err.message);
            if (err.code == 11000) {
                tokenSchema.findOne({
                    account_id: req.body.account_id
                }).lean().exec(function (err, foundToken) {
                    console.log('Account already exists, send back the original token', foundToken.token);
                    res.status(200).send({ token: foundToken.token })
                })
            }
        });
    } else {
        res.status(401).send('Not Authorized');
    }
});

//Make announcement to all Slack teams
router.post('/announcement/',
    passport.authenticate('bearer', { session: false }),
    function(req, res) {
        console.log(req.body);
        var announcement = req.body;
        if (announcement) {
            controller.storage.teams.all(function (err, teams) {
                teams.forEach(function (team) {
                    if (err) console.log('Error retrieving all teams', err);
                    console.log('Team ID', team.id);
                    var bot = _bots[team.id];
                    announcement.channel = team.default_channel;
                    console.log('Announcement:', announcement);
                    bot.say(announcement, function(err) {
                        if (err) {
                            console.log('Error sending announcement', err);
                            // lookupGeneralChan(bot)
                            // .then(function (generalChan) {
                            //     announcement.channel = generalChan;
                            //     bot.say(announcement,function(err) {
                            //         if (err) console.log('Error sending new case to general channel', err);
                            //     })
                            // })
                        }
                    });
                })
            });
            res.status(200).send({ result: 'All messages sent' });
        } else {
            res.status(500).send();
        }
    }
);

router.get('/', function(req, res, next) {
    res.render('index', { title: 'You\'ve reached the Support Bot api interface' });
});

module.exports = router;
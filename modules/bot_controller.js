if (!process.env.SLACK_KEY || !process.env.SLACK_SECRET) {
    console.log('Error: Specify clientId and clientSecret in environment');
    process.exit(1);
}

var Botkit = require('botkit');
var mongodbStorage = require('../modules/mongo_storage')({mongoUri: process.env.MONGODB_URI});

controller = Botkit.slackbot({
    clientId: process.env.SLACK_KEY,
    clientSecret: process.env.SLACK_SECRET,
    require_delivery: true,
    storage: mongodbStorage,
    //debug: true
});

module.exports = controller;
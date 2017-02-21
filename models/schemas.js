var mongoose = require('mongoose');


/**
 * Creates a new mongo model
 *
 * @param  {String} zone - teams, users, or channels
 * @return {Object} - a monto model object that conforms to botkit standards
 */

var teamSchema = mongoose.Schema({
    id: { type: String, unique: true, index: true },
    default_channel: String,
    name: String,
    domain: String,
    email_domain: String,
    enterprise_id: String,
    enterprise_name: String,
    icon: {
        image_34: String,
        image_44: String,
        image_68: String,
        image_88: String,
        image_102: String,
        image_132: String,
        image_default: Boolean
    },
    netsuite: {
        slack_listener_uri: String,
        account_id: { type: String, unique: true, index: true }
    },
    token: String,
    bot: {
        send_via_rtm: { type: Boolean, default: true },
        token: String
    },
    users: [
        {
            name: String,
            token: String,
            secret: String,
            is_default: Boolean
        }
    ],
    message_count: Number,
    active: { type: Boolean, default: true },
    date_created: { type: Date, default: Date.now }
});

var channelSchema = mongoose.Schema({
    id: { type: String, unique: true, index: true },
    name: String,
    team_id: String,
    messages: [
        {
            date: { type: Date, default: Date.now },
            message_type: String,
            message: String
        }
    ],
    message_count: Number,
    active: { type: Boolean, default: true },
    date_created: { type: Date, default: Date.now }
});

var userSchema = mongoose.Schema({
    id: {type: String, unique: true, index: true },
    team_id: String,
    name: String,
    deleted: Boolean,
    status: String,
    color: String,
    real_name: String,
    tz: String,
    tz_label: String,
    tz_offset: Number,
    profile: {
        avatar_hash: String,
        first_name: String,
        last_name: String,
        real_name: String,
        email: String,
        skype: String,
        phone: String,
        image_24: String,
        image_32: String,
        image_48: String,
        image_72: String,
        image_192: String
    },
    messages: [
        {
            date: { type: Date, default: Date.now },
            keyword: String,
            message: String
        }
    ],
    message_count: Number,
    is_admin: Boolean,
    is_owner: Boolean,
    has_2fa: Boolean,
    active: { type: Boolean, default: true },
    date_created: { type: Date, default: Date.now }
});

var tokenSchema = mongoose.Schema({
    token: { type: String, unique: true, index: true },
    active: { type: Boolean, default: true },
    date_created: { type: Date, default: Date.now }
});

module.exports = {
    teams: mongoose.model('teams', teamSchema),
    channels: mongoose.model('channels', channelSchema),
    users: mongoose.model('users', userSchema),
    tokens: mongoose.model('tokens', tokenSchema)
};
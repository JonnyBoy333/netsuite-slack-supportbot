var _bots = {};

module.exports.trackBot = function trackBot(bot) {
    _bots[bot.team_info.id] = bot;
};

module.exports.bots = _bots;
var _bots = {};
var _interactive_bots = {};

module.exports.trackBot = function trackBot(bot, type) {
    if (type === 'main') _bots[bot.team_info.id] = bot;
    else if (type === 'interactive') _interactive_bots[bot.team_info.id] = bot;
};

module.exports.bots = _bots;
module.exports.interacticeBots = _interactive_bots;
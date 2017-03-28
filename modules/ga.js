var ua = require('universal-analytics');

var ga = {
    pageview: function(title) {
        return function(req,res,next) {
            var udata = {
                dp: req.path,
                dt: title,
                dh: 'http://netsuitesupportbot.com/',
                uip: req.ip,
                ua: req.headers['user-agent']
            };
            if (req.visitor) {
                req.visitor
                    .pageview(udata)
                    .send();
            }
            next();
        };
    }
};
module.exports = ga;
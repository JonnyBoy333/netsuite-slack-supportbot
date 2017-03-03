var request = require("request"),
    OAuth = require('oauth-1.0a');

//send to netsuite
function sendData (message) {
    var oauth = OAuth({
        consumer: {
            public: process.env.NETSUITE_LOGGING_KEY,
            secret: process.env.NETSUITE_LOGGING_SECRET
        },
        signature_method: 'HMAC-SHA1'
    });

    token = {
        public: process.env.NETSUITE_LOGGING_TOKEN,
        secret: process.env.NETSUITE_LOGGING_TOKEN_SECRET
    };

    var request_data = {
        url: process.env.NETSUITE_LOGGING_URI,
        method: 'POST'
    };

    var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
    headerWithRealm.Authorization += ', realm=' + process.env.NETSUITE_ACCT_ID;
    headerWithRealm['content-type'] = 'application/json';
    console.log('Header Authorization: ' + JSON.stringify(headerWithRealm));

    request({
        url: request_data.url,
        method: request_data.method,
        headers: headerWithRealm,
        json: message
    }, function (error, response, body) {
        if (error) console.log(error);
        else console.log('Added message to NS db', response.body);
    });
}

module.exports = sendData;

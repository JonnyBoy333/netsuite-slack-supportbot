/**
 * Created by jonlamb on 5/15/16.
 */

var express = require('express');
var router = express.Router();
var request = require('request');
var OAuth   = require('oauth-1.0a');
var url = require('url');

/* GET home page. */
router.get('/', function (req, res, next) {
    console.log("URL: " + req.url);

    var remoteAccountID = '3499441';

    //user token
    var token = {
        public: '20368a86cee533acfd30f6bc746cbdd38bce00cf94f8f4186fc4b2bdde1c0c22',
        secret: '5c70b99af53a44fabfe438b2fb51e8cae474255f682cd47e26e1a018f5ad3e03'
    };

    //app credentials
    var oauth = OAuth({
        consumer: {
            public: '77b801f04debf911d3e5048a1e381d10aa166485571fdbdbac94f35c00ddf623',
            secret: 'e03b4a64ee5fe2377851f35090260d1b7714f3d7cd2905134d3e997b364e12dc'
        },
        signature_method: 'HMAC-SHA1'
    });

    var request_data = {
        url: 'https://rest.netsuite.com/app/site/hosting/restlet.nl?script=79&deploy=1',
        method: 'POST',
        data: {
            status: 'Hello World'
        }
    };

    // var oauth_data = {
    //     oauth_consumer_key: oauth.consumer.public,
    //     oauth_nonce: oauth.getNonce(),
    //     oauth_signature_method: oauth.signature_method,
    //     oauth_timestamp: oauth.getTimeStamp(),
    //     oauth_version: '1.0',
    //     oauth_token: token.public,
    //     realm: remoteAccountID
    // };

    var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
    headerWithRealm.Authorization += ',realm=' + remoteAccountID;
    console.log('Header Authorization: ' + headerWithRealm);

    request({
        url: request_data.url,
        method: request_data.method,
        form: request_data.data,
        headers: headerWithRealm
    }, function(error, response, body) {
        var html = 'Calling: ' +
            request_data.url +
            '\n' +
            'Generated OAuth header:\n' +
            headerWithRealm.Authorization +
            '\n\n' +
            'Response:\n' +
            response.body
        res.end(html);
        console.log(response);
        if (error){
            console.log(error);
        }
    });
    //res.end("OAuth Testing");
});

module.exports = router;
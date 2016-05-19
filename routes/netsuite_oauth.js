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

    var remoteAccountID = '"3499441"';

    //user token
    var token = {
        public: 'e147942fe6de80b50457bf2128410e1792b548775cb6429afa218aa20a50c6b4',
        secret: 'a10ddd0959e56ec5d0ee85a171f11f0f37b28095e50f9f68192200cf1a7c62e7'
    };

    //app credentials
    var oauth = OAuth({
        consumer: {
            public: '2656abe35499cf19402a26de2cdb8875264001ab9493f9a22ecf4ee056030a81',
            secret: 'df267963aeaa4d8d47e6224131496e9595902eb239d87e692e71963dd4789563'
        },
        signature_method: 'HMAC-SHA1'
    });

    var request_data = {
        url: 'https://rest.netsuite.com/app/site/hosting/restlet.nl?script=79&deploy=1',
        method: 'GET'
    };

    var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
    headerWithRealm.Authorization += ', realm=' + remoteAccountID;
    console.log('Header Authorization: ' + JSON.stringify(headerWithRealm));
    request.post({
            url: request_data.url,
            headers: headerWithRealm,
            json: {data: "Hello World"}
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
});

module.exports = router;
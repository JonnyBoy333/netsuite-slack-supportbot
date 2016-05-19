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
        public: '416bbb923ecf3831811112a205ec6dc44cf8a0c067230dd3a4f6c047c8fd7dae',
        secret: '3aa761abe62620b76c14f59a13aa2658caf3abb72cd725987f8ba48807517af2'
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
        method: 'POST',
        data: {
            status: 'Hello World'
        }
    };

    var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
    headerWithRealm.Authorization += ', realm=' + remoteAccountID;
    console.log('Header Authorization: ' + JSON.stringify(headerWithRealm));

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
});

module.exports = router;
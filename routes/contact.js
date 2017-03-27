var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('contact', {
        title: 'Contact Us',
        displaysuccess: 'none',
        displayfailure: 'none'
    });
});

router.post('/', function (req, res, next) {
    console.log('Request', req.body);

    var transporter = nodemailer.createTransport({
        service: 'Mailgun',
        auth: {
            user: [process.env.MAILGUN_USER],
            pass: [process.env.MAILGUN_PASS]
        }
    });

    //Mail options
    var mailOpts = {
        from: req.body.name + ' <' + req.body.email + '>', //grab form data from the request body object
        //from: 'Jon <jonnylamb@gmail.com>', //grab form data from the request body object
        to: 'jonnylamb@gmail.com',
        subject: req.body.subject,
        text: req.body.message
    };

    console.log('Mail Options', mailOpts);
    transporter.sendMail(mailOpts, function (error, response) {
        //Email not sent
        if (error) {
            // res.render('contact', { title: 'Raging Flame Laboratory - Contact', msg: 'Error occured, message not sent.', err: true, page: 'contact' })
            console.log('Error sending email', error);
            res.render('contact', {
                title: 'Contact Us',
                displaysuccess: 'none',
                displayfailure: 'normal'
            });
        }
        //Yay!! Email sent
        else {
            console.log('Email successfully sent');
            res.render('contact', {
                title: 'Contact Us',
                displaysuccess: 'normal',
                displayfailure: 'none'
            });
            // res.render('contact', { title: 'Raging Flame Laboratory - Contact', msg: 'Message sent! Thank you.', err: false, page: 'contact' })
        }
    });
});

module.exports = router;
const express = require('express');
const bodyParser = require('body-parser');
const { SmsServiceController } = require('./sms-service/controller');
const { ChatApiService } = require('./chat-api/service');
const { SmsService } = require('./sms-service/service');
require('dotenv').config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use((req, res, next) => {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS, PUT, PATCH, DELETE'
    );

    // Request headers you wish to allow
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-Requested-With,content-type'
    );

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

const chatApiService = new ChatApiService(1, 52);
const smsService = new SmsService(process.env.HTTP_SMS_API_KEY, process.env.SENDER_PHONE)
const smsServiceController = new SmsServiceController(chatApiService, smsService)

app.post('/callback', (req, res) => smsServiceController.processCallback(req, res));

module.exports = app;
const express = require('express');
const bodyParser = require('body-parser');
const { SmsServiceController } = require('./sms-service/controller');
const { ChatApiService } = require('./chat-api/service');
const { SmsService } = require('./sms-service/service');
const cron = require('node-cron');

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

const chatApiService = new ChatApiService(1, 53);
const smsService = new SmsService(process.env.HTTP_SMS_API_KEY, process.env.SENDER_PHONE)
const smsServiceController = new SmsServiceController(chatApiService, smsService)

app.post('/callback', (req, res) => smsServiceController.processCallback(req, res));



const messageToSendTemplate = ({recepientName, managerName, companyName, deceasedName}) => `Hello ${recepientName}, I'm ${managerName} with ${companyName}. I want to express my condolences for your loss. We're here to help with real estate matters during probate. Has there been anything during the process that you’d like assistance with?`



let lastSendingStarted = false;
cron.schedule('* * * * *', async () => {
    if (lastSendingStarted) {
        console.error("Worker is busy");
        return;
    }
    lastSendingStarted = true;
    await smsServiceController.processSendingToUser(process.env.SENDER_TASK_NAME, process.env.CONTACTS_CSV_PATH, messageToSendTemplate);
    lastSendingStarted = false;
}, { runOnInit: true })

module.exports = app;
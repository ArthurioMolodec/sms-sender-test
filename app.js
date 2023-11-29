const express = require('express');
const bodyParser = require('body-parser');
const { SmsServiceController } = require('./sms-service/controller');
const { ChatApiService } = require('./chat-api/service');
const { SmsService } = require('./sms-service/service');
const cron = require('node-cron');
const fs = require('fs');

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

const logFile = './log.txt';

async function writeToLog(logText) {
    const ts = (new Date).toISOString();
    fs.appendFileSync(logFile, `${ts}\n${logText}\n\n`);
}

app.post('/callback', async (req, res) => {
    try {
        await writeToLog('[CALLBACK]\n' + JSON.stringify(req.body));
    } catch(ex) {
        console.error("Error on callback log ", ex);
        await writeToLog('[ERROR ON CALLBACK LOG]\n' + ex);
    }
    try {
        await smsServiceController.processCallback(req, res)
    } catch(ex) {
        console.error("Error on processCallback ", ex);
        await writeToLog('[ERROR ON PROCESS CALLBACK]\n' + ex);
    }

    res.send();
});



const messageToSendTemplate = ({recepientName, managerName, companyName, deceasedName}) => `Hello ${recepientName}, I'm ${managerName} with ${companyName}. I want to express my condolences for your loss. We're here to help with real estate matters during probate. Has there been anything during the process that you’d like assistance with?`



let lastSendingStarted = false;
cron.schedule('*/2 * * * *', async () => {
    if (lastSendingStarted) {
        console.error("Worker is busy");
        return;
    }
    lastSendingStarted = true;
    try {
        await smsServiceController.processSendingToUser(
            process.env.SENDER_TASK_NAME, 
            process.env.CONTACTS_CSV_PATH, 
            messageToSendTemplate, 
            process.env.ADD_COUNTRY_CODE ?? '+1'
        );
    } catch (ex) {
        console.error("Error on processSendingToUser ", ex);
        await writeToLog('[ERROR ON processSendingToUser]\n' + ex);
    }
    lastSendingStarted = false;
}, { runOnInit: true })

module.exports = app;
const fs = require('fs');
const parse = require('csv-parser');

class SmsServiceController {
    constructor(chatApiService, smsService, databaseDirectory = './db') {
        this.chatApiService = chatApiService;
        this.smsService = smsService;
        this.databaseDirectory = databaseDirectory;
    }

    async processCallback(req, res) {
        const decodedCallback = await this.smsService.decodeCallback(req.body);
        console.log(decodedCallback);
        if (!decodedCallback) {
            res.send();
            return;
        }

        if (decodedCallback.phoneNumberFrom === this.smsService.smsSender) {
            console.error("Tried to answer to itself " + decodedCallback.phoneNumberFrom);
            throw new Error("Tried to answer to itself " + decodedCallback.phoneNumberFrom);
        }

        if (decodedCallback.messageText === 'Sorry, this service is not available.') {
            console.error("Error message decoded ", decodedCallback);
            throw new Error("Error message decoded " + JSON.stringify(decodedCallback));
        }

        const gptAnswer = await this.chatApiService.getCompletion(decodedCallback.phoneNumberFrom, decodedCallback.messageText);

        if (!gptAnswer) {
            throw new Error("Empty answer from GPT");
        }

        const postProcessedCallback = gptAnswer.replace(/\[calendly\s+link\]/gmi, 'https://calendly.com/maximmentors');

        await this.smsService.sendSms(decodedCallback.phoneNumberFrom, postProcessedCallback)

        // res.json({ decodedCallback }).send();
        res.send();
    }

    initProjectDBFolder(projectName) {
        const folderForProject = `${this.databaseDirectory}/${projectName}`;
        if (!fs.existsSync(folderForProject)) {
            fs.mkdirSync(folderForProject, { recursive: true })
        }
        return folderForProject;
    }

    getDb(projectName) {
        const folderForProject = this.initProjectDBFolder(projectName);
        const systemDBFile = folderForProject + '/data.json';
        let fileData = { lastSentId: -1, lastSentAt: null };
        if (fs.existsSync(systemDBFile)) {
            const loadedfileData = JSON.parse(fs.readFileSync(systemDBFile));
            if (loadedfileData) {
                fileData = loadedfileData;
            }
        }

        return fileData;
    }

    saveDb(projectName, data) {
        const folderForProject = this.initProjectDBFolder(projectName);
        const systemDBFile = folderForProject + '/data.json';

        fs.writeFileSync(systemDBFile, JSON.stringify(data))
    }

    async parseCsv(path) {
        return await new Promise(r => {
            const results = [];
            fs.createReadStream(path)
                .pipe(parse())
                .on('data', (data) => results.push(data))
                .on('end', () => {
                    r(results);
                });
        })
    }

    async processSendingToUser(projectName, contactsListFileCsv, messageToSendTemplate, countryCode = '+1', lastSentId = null) {
        const db = this.getDb(projectName);
        if (Date.now() - db.lastSentAt <= 120 * 1000 - 10) {
            console.error("Timeout needs to be awaited for");
            return;
        }
        const lastSentMessage = lastSentId ?? db.lastSentId;
        const contactsList = await this.parseCsv(contactsListFileCsv);

        const rowsToSend = contactsList.slice(lastSentMessage + 1, lastSentMessage + 2);

        if (!rowsToSend.length) {
            return;
        }

        console.log(rowsToSend);

        const rowToSend = rowsToSend[0];

        // const phoneNumber = "+" + rowToSend['PHONE1'].replace(/\+/g, '');
        const phoneNumber = countryCode + rowToSend['PHONE1'];


        console.log({ rowToSend, phoneNumber })

        const dbOld = { ...db };

        db.lastSentAt = Date.now();
        db.lastSentId = lastSentMessage + 1;
        this.saveDb(projectName, db);


        const recepientName = (rowToSend['FIRST'] /* + " " + rowToSend['LAST'] */).trim().toLowerCase();


        const messageTOSend = messageToSendTemplate({
            recepientName: recepientName.length ? recepientName.charAt(0).toUpperCase() + recepientName.slice(1) : '', 
            managerName: "Ashley", 
            companyName: 'Western Probate Solutions', 
            deceasedName: ''
        });

        let isSent = false;


        try {
            console.log(phoneNumber, messageTOSend);
            await this.smsService.sendSms(phoneNumber, messageTOSend);
            isSent = true;
            await this.chatApiService.appendMessageFromBotToConversation(phoneNumber, messageTOSend);
        } catch (ex) {
            console.error(ex, isSent);

            if (!isSent) {
                db.lastSentId = dbOld.lastSentId;
                db.lastSentAt = dbOld.lastSentAt;
                this.saveDb(projectName, db);    
            }

            throw ex;
        }
        
    }
}

module.exports = {
    SmsServiceController
}
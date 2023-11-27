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
        const gptAnswer = await this.chatApiService.getCompletion(decodedCallback.phoneNumberFrom, decodedCallback.messageText);

        if (!gptAnswer) {
            res.send();
            return;
        }

        await this.smsService.sendSms(decodedCallback.phoneNumberFrom, gptAnswer)

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

    async processSendingToUser(projectName, contactsListFileCsv, messageToSendTemplate, lastSentId = null) {
        const db = this.getDb(projectName);
        if (Date.now() - db.lastSentAt <= 60 * 1000) {
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

        const phoneNumber = "+" + rowToSend['PHONE1'].replace(/\+/g, '');


        console.log({ rowToSend, phoneNumber })

        const dbOld = { ...db };

        db.lastSentAt = Date.now();
        db.lastSentId = lastSentMessage + 1;
        this.saveDb(projectName, db);


        const messageTOSend = messageToSendTemplate({
            recepientName: (rowToSend['FIRST'] + " " + rowToSend['LAST']).trim(), 
            managerName: "Ashley", 
            companyName: 'Western Probate Solutions', 
            deceasedName: ''
        });


        try {
            await this.chatApiService.appendMessageFromBotToConversation(phoneNumber, messageTOSend);
            console.log(phoneNumber, messageTOSend);
            await this.smsService.sendSms(phoneNumber, messageTOSend);
        } catch (ex) {
            console.error(ex);

            db.lastSentId = dbOld.lastSentId;
            db.lastSentAt = dbOld.lastSentAt;
            this.saveDb(projectName, db);
        }
        
    }
}

module.exports = {
    SmsServiceController
}
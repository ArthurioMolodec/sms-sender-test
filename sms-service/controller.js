class SmsServiceController {
    constructor(chatApiService, smsService) {
        this.chatApiService = chatApiService;
        this.smsService = smsService;
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
}

module.exports = {
    SmsServiceController
}
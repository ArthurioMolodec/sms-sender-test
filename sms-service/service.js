const { default: axios } = require("axios");

class SmsService {
    constructor(apiKey, phoneNumberFrom) {
        this.apiKey = apiKey;
        this.phoneNumberFrom = phoneNumberFrom;
    }

    async sendSms(destination, content) {
        const response = await axios(
            'https://api.httpsms.com/v1/messages/send', 
            { 
                method: "POST", 
                data: {
                    "from": this.phoneNumberFrom,
                    "to": destination,
                    "content": content,
                }, 
                headers: {
                    'x-api-key': this.apiKey,
                }
            }
        );

        console.log(response);
    }

    async decodeCallback(callback) {
        const { type, data } = callback;

        if (type === 'message.phone.received') {
            const phoneNumberFrom = data.contact;
            const messageText = data.content;

            return {
                phoneNumberFrom,
                messageText
            }
        }

        return null;
    }
}

module.exports = {
    SmsService,
}
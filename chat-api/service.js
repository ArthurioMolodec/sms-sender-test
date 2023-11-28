const { default: axios } = require("axios");

class ChatApiService {
    constructor(bot_id, project_id, conversationIdPrefix = 'SMS_SENDER_SERVICE_') {
        this.bot_id = bot_id;
        this.project_id = project_id;
        this.conversationIdPrefix = conversationIdPrefix;
    }


    async getCompletion(conversationId, prompt) {
        const response = await axios(
            'http://178.18.248.235:7216/api/complete', 
            { 
                method: "GET", 
                params: { 
                    bot_id: this.bot_id, 
                    project_id: this.project_id,

                    conversationId: this.conversationIdPrefix + '-' + conversationId.replace(/[^0-9]/g, ''),
                    prompt,
                    conversationName: conversationId,
                } 
            }
        );

        return response.data.data.answer;
    }

    async appendMessageFromBotToConversation(conversationId, messageText) {
        const response = await axios(
            'http://178.18.248.235:7216/api/append-conversation', 
            { 
                method: "POST", 
                data: { 
                    bot_id: this.bot_id, 
                    project_id: this.project_id,

                    conversationId: this.conversationIdPrefix + '-' + conversationId.replace(/[^0-9]/g, ''),
                    name: conversationId,
                    messages: [
                        {
                            type: 'ai_message',
                            message: messageText,
                            messageId: Date.now().toString()
                        }
                    ]
                } 
            }
        );
    }

}

module.exports = {
    ChatApiService,
}
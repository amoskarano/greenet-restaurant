const AfricasTalking = require('africastalking');

exports.handler = async (event) => {
    // Validate input
    const { phone, message } = JSON.parse(event.body || '{}');

    if (!phone || !/^07\d{8}$/.test(phone)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid Kenyan phone number (07XXXXXXXX)' })
        };
    }

    if (!message || message.length > 160) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Message required (max 160 chars)' })
        };
    }

    try {
        const at = AfricasTalking({
            apiKey: process.env.AT_API_KEY,
            username: process.env.AT_USERNAME
        });

        const response = await at.SMS.send({
            to: [`+254${phone.substring(1)}`], // Convert to international format
            message,
            enqueue: true // Queue if rate limited
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                data: response,
                messageId: response.SMSMessageData.Recipients[0]?.messageId
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                ...(error.response && { details: error.response.body })
            })
        };
    }
};
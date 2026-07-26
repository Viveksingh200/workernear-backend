import twilio from "twilio";

/**
 * Sends an SMS message using Twilio.
 * @param {string} toPhone - Recipient phone number.
 * @param {string} message - Message text.
 * @returns {Promise<any>} - Twilio message response or mock indicator if not configured.
 */
export const sendSms = async (toPhone, message) => {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

    // Check if Twilio credentials are configured
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER || TWILIO_ACCOUNT_SID === "your_twilio_account_sid") {
        console.log(`[MOCK SMS] Twilio credentials not configured in .env. Mock message for ${toPhone}: "${message}"`);
        return { mock: true };
    }

    try {
        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

        // Format phone number to E.164 format if missing country code (defaulting to +91)
        const formattedPhone = toPhone.startsWith("+") ? toPhone : `+91${toPhone}`;

        const response = await client.messages.create({
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to: formattedPhone
        });

        console.log(`[TWILIO SMS] Sent to ${formattedPhone}, SID: ${response.sid}`);
        return response;
    } catch (error) {
        console.error("[TWILIO SMS ERROR]", error.message || error);
        throw new Error(error.message || "Failed to send SMS via Twilio.");
    }
};

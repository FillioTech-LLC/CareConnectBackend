const twilio = require("twilio");

let client;

function getClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Missing Twilio credentials: set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN");
  }
  if (!client) {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return client;
}

async function sendSms({ to, body }) {
  if (!to || !body) {
    throw new Error("'to' and 'body' are required to send SMS");
  }
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) {
    throw new Error("Missing TWILIO_FROM_NUMBER");
  }

  const twilioClient = getClient();
  const message = await twilioClient.messages.create({ to, from, body });
  return { sid: message.sid, status: message.status };
}

module.exports = { sendSms };


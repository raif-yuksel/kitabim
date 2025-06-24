const functions = require("firebase-functions");
const fetch = require("node-fetch");
const cors = require('cors')({origin: true});
const RECAPTCHA_SECRET = functions.config().recaptcha.secret;

exports.verifyRecaptcha = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    const token = req.body.token;
    if (!token) {
      res.status(400).json({ success: false, message: "No token provided" });
      return;
    }
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${token}`;
    try {
      const response = await fetch(url, { method: "POST" });
      const result = await response.json();
      res.status(200).json(result);
    } catch (e) {
      console.error("verifyRecaptcha function error:", e);
      res.status(500).json({ success: false, message: "verifyRecaptcha failed" });
    }
  });
});

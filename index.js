const {firestoreDatabase} = require("./Database/firebase");
const express = require("express"); 
const admin = require("firebase-admin")
// const serviceAccount = require("./Database/optimal-doc-firebase-adminsdk-fnfzt-4d507fce77.json");
const {Expo} = require("expo-server-sdk");

// admin.initializeApp({
//     credential:admin.credential.cert(serviceAccount)
// })
const app = express();
const port = 8080;

let expo = new Expo();

const tokenArray = [];

app.use(express.json()) // Uses middleware to parse the JSON

app.listen(port, () => console.log(`its alive on http://localhost:${port}`))

app.get(`/getAllPatients`, async (req, resp) => {
    try{
        const querySnapshot = await firestoreDatabase.getDocs(firestoreDatabase.collection(firestoreDatabase.db, "Patients"));
        const listOfPatientsFromDB = querySnapshot.docs.map(doc => ({
                    ...doc.data().patientInfo,
                    documentID: doc.id
                }))
        console.log(listOfPatientsFromDB)

        resp.status(200).send(listOfPatientsFromDB)
    }catch (error) {
        console.error("Error fetching patients:", error);
        resp.status(500).send({ error: "Failed to fetch patients." });
  }
})

app.post('/submitToken', (req, res) => {
    const token = req.body.token;
    if (!token)
        return res.status(401).json({ error: "Token not provided" });
    tokenArray.push(token);
    console.log(`token ->  ${token}`)
    return res.json({ msg: "Token received successfully"});
})

app.post("/sendNotification", async (req, res) => {
    // Create the messages array
    let token = "ExponentPushToken[giGYeEBIHTjGlhoija7mk_]"
    let messages = [];
    if (Expo.isExpoPushToken(token)) {
        messages.push({
            to: token,
            sound: 'default',
            title: "Gama es gay",
            body: "La persona mas gay que conozco, despues de mi hermano",
            data: { withSome: 'data' },
        });
    }

    // Send the notifications
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error(error);
            }
        }
    })();

    res.status(200).send("Notification sent");
});




// app.get("/sendNotification", (req, res) => {
//     if (!tokenArray. length) 
//         return res. status (400). json({ msg: "Fail" })

//     const message = {
//         notification: {
//             title: "Your Notification Title", 
//             body: "Your Notification Body"
//         },
//             token: tokenArray[0]
//     };
//     admin.messaging().send(message)
//          .then((response) => {
//             console.log("Successfully sent message:", response); 
//             return res.status(200).json({ msg: "Send token" });
//         })
//         .catch ((error) =>
//         {
//             console.error("Error sending message:", error);
//             return res.status (400).json({ error });
//         });
// })

// app.post("/submitToken", (req, res) => {
//     // Access the token from the request body, query parameters, or headers
//     const token = req.body.token;
//     // Check if the token is present
//     if (!token)
//         return res.status(401).json({ error: "Token not provided" });
//     tokenArray.push(token);
//     console.log(`token ->  ${token}`)
//     // Your logic with the token
//     // For example, you can send a response indicating success
//     return res.json({ msg: "Token received successfully"});
// })


// app.get("/getTokens", (req, res) => {
//     console.log(tokenArray)
//     res.status(200).send(tokenArray)
// })


// app.use ((req, res, next) => {
//     const error = new Error("Not found");
//     error.status = 404;
//     next (error) ;
// });

// app.use((error, req, res, next) => {
//     res.status (error.status || 500);
//     res. json ({
//     error: {
//         message: error.message,
//     },
//     });
// });

const {firestoreDatabase} = require("./Database/firebase");
const express = require("express"); 
const admin = require("firebase-admin")
const cron = require("node-cron");
const cors = require('cors');
// const serviceAccount = require("./Database/optimal-doc-firebase-adminsdk-fnfzt-4d507fce77.json");
const {Expo} = require("expo-server-sdk");
const { TwitterAuthProvider } = require("firebase/auth/web-extension");

// admin.initializeApp({
//     credential:admin.credential.cert(serviceAccount)
// })
const app = express();
const port = 8080;

let expo = new Expo();

const tokenArray = [];

app.use(cors()); // Enable CORS for all routes

const corsOptions = {
  origin: 'http://your-frontend-domain.com', // Replace with your frontend domain
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
};

app.use(cors(corsOptions));

app.use(express.json()) // Uses middleware to parse the JSON

app.listen(port, () => console.log(`its alive on http://localhost:${port}`))

app.get(`/getAllPatients`, async (req, resp) => {
    try{
        const querySnapshot = await firestoreDatabase.getDocs(firestoreDatabase.collection(firestoreDatabase.db, "Patients"));
        const listOfPatientsFromDB = querySnapshot.docs.map(doc => ({
                    ...doc.data().patientInfo,
                    documentID: doc.id
                }))
        // console.log(listOfPatientsFromDB)

        resp.status(200).send(listOfPatientsFromDB)
    }catch (error) {
        console.error("Error fetching patients:", error);
        resp.status(500).send({ error: "Failed to fetch patients." });
  }
})

app.post("/sendPatientCompletedNotification", async (req, res) => {
    // Create the messages array
    // let token = "ExponentPushToken[wOX2vLBx-1QT7gLI3YNG3i]" 
    const tokens = await getListOfTokensFromDB();
    let messages = [];
    const {patientRecordNumber} = req.body;
    const currentTime = new Date().toLocaleString("en-US", { timeZone: "America/Halifax" });
     if(!patientRecordNumber)
      return res.status(400).send("Patient record number is required");
    // console.log("current time -> ", currentTime)
    // console.log("tokens -> ", tokens)
    var notificationContent = {
        title: "Patient Has Completed Test",
        body: `Patient with record id "${patientRecordNumber}" has completed their test!`,
        date: currentTime,
    }

    await firestoreDatabase.addDoc(firestoreDatabase.collection(firestoreDatabase.db, "Notifications"), notificationContent);

    tokens.map(token => {
        if (Expo.isExpoPushToken(token)) {
            messages.push({
                to: token,
                sound: 'default',
                title: notificationContent.title,
                body: notificationContent.body,
                data: notificationContent.date
            });
        }
    })
 
    
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

async function getListOfTokensFromDB (){
 const querySnapshot = await firestoreDatabase.getDocs(firestoreDatabase.collection(firestoreDatabase.db, "Users"));
        const listOfUsersInDB = querySnapshot.docs.map(doc => ({
                    ...doc.data().userInfo,
                    documentID: doc.id
                }))
        // console.log(listOfUsersInDB)
    let tokens = listOfUsersInDB.map(user => user.notificationPushToken);

    return tokens;
}


/* 
async function notifyDoctorsOfPatientsMissingTests(listOfPatientWithMissingTests) {
  // Fetch the list of tokens from the database
  const tokens = await getListOfTokensFromDB();

  let stringOfMissingPatients = "";
  // Create a string of patient record numbers
  for (let patient of listOfPatientWithMissingTests) 
    stringOfMissingPatients += "- " + patient.patientRecordNumber + " \n";
  


  let messages = []
  tokens.map(async token => {
    if (!Expo.isExpoPushToken(token)) {
      console.error("Invalid Expo push token:", token);
      //return;
    }else{
      const currentTime = new Date().toLocaleString("en-US", { timeZone: "America/Halifax" });
      var notificationContent = {
          title: "Patients with missing tests",
          body: `The following patients have not yet completed their tests: \n ${stringOfMissingPatients} \n Please remind the patients that they need to complete their tests.`,
          date: currentTime,
      }

      await firestoreDatabase.addDoc(firestoreDatabase.collection(firestoreDatabase.db, "Notifications"), notificationContent);

      messages.push({
        to: token,
        sound: "default",
        title: notificationContent.title,
        body: notificationContent.body,
        data: notificationContent.date,
      });
    }
})

// Send the notifications
  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];
  (async () => {
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error("Error sending notifications to patients -> ", error);
            }
        }
    })();

}
    */

// Receives the list of patients in the DB that have not completed their tests
async function notifyDoctorsOfPatientsMissingTests(listOfPatientWithMissingTests) {
  // Fetch the list of tokens from the database
  const tokens = await getListOfTokensFromDB();

  let stringOfMissingPatients = "";
  // Create a string of patient record numbers
  listOfPatientWithMissingTests.map(patient => {
        let stringOfTestsMissing = ""
        patient.listOfTestOrderedButNotDelivered.map(testName => {
          stringOfTestsMissing += `${testName}, `;
        })
        stringOfMissingPatients += `- ${patient.patientRecordNumber}, is missing the following tests: ${stringOfTestsMissing} \n`;
  })
  


  let messages = []
  tokens.map(async token => {
    if (!Expo.isExpoPushToken(token)) {
      console.error("Invalid Expo push token:", token);
      //return;
    }else{
      const currentTime = new Date().toLocaleString("en-US", { timeZone: "America/Halifax" });
      var notificationContent = {
          title: "Patients with missing tests",
          body: `The following patients have not yet completed their tests: \n ${stringOfMissingPatients} \n Please remind the patients that they need to complete their tests.`,
          date: currentTime,
      }

      await firestoreDatabase.addDoc(firestoreDatabase.collection(firestoreDatabase.db, "Notifications"), notificationContent);

      messages.push({
        to: token,
        sound: "default",
        title: notificationContent.title,
        body: notificationContent.body,
        data: notificationContent.date,
      });
    }
})


// Send the notifications
  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];
  (async () => {
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error("Error sending notifications to patients -> ", error);
            }
        }
    })();

}

// Function to determine whether a patient has not completed their tests
function isPatientMissingTests(patient) {
  return patient.allTestsCompleted === "no";
}


// Function to check if patients are missing their tests and send notifications to the doctors letting them know of the patients that are missing tests
async function checkPatientsAndSendNotifications(){
  const currentTime = new Date().toLocaleString("en-US", { timeZone: "America/Halifax" });
  console.log(`Running scheduled patient test check at ${currentTime}`);
  try {
      // Fetch patients from Firestore
      const querySnapshot = await firestoreDatabase.getDocs(firestoreDatabase.collection(firestoreDatabase.db, "Patients"));

      // Map the results to an array of patient objects
      const patients = querySnapshot.docs.map(doc => ({
        ...doc.data().patientInfo,
        documentID: doc.id
      }));

      // Send the notifications to the doctors about their patients missing tests
      const listOfPatientPromises = patients.map(async patient => {
        const listOfTest = await getTestsOrderedButNoDelivered(patient)
        return {
          patientRecordNumber: patient.patientRecordNumber,
          listOfTestOrderedButNotDelivered: listOfTest
        }
      })

      const listOfPatients = await Promise.all(listOfPatientPromises);

      await notifyDoctorsOfPatientsMissingTests(listOfPatients);

  } catch (error) {
    console.error("Error during scheduled test check:", error);
  }
}

async function getTestsOrderedButNoDelivered(patient) {
  const querySnapshot = await firestoreDatabase.getDocs(firestoreDatabase.collection(firestoreDatabase.db, "MedicalExams"));
  const listOfMedicalExamsFromDB = querySnapshot.docs.map(doc => ({
    ...doc.data().MedicalExamsInfo
  }));

  return listOfMedicalExamsFromDB.map(MedicalExamInfo => {
    const medicalExamName = MedicalExamInfo.MedicalExamsName.toLowerCase()
    const dayDeliveredKey = `${medicalExamName}DateTestIsDelivered`;
    const dayOrderedKey = `${medicalExamName}DateTestIsOrdered`;
    if(patient[dayOrderedKey] != "" && patient[dayDeliveredKey] == "" && hasTestPassedReminderDate(new Date(patient[dayOrderedKey]))) 
      return MedicalExamInfo.MedicalExamsName;
  }).filter(testName => testName !== undefined);
}



async function hasTestPassedReminderDate(testDate) {

  if (!testDate) return false;
  const docRef = await firestoreDatabase.doc(
    firestoreDatabase.collection(firestoreDatabase.db, "NotificationSettings"),
    "DaysBeforeTestReminder"
  );

  const docSnap = await firestoreDatabase.getDoc(docRef);
  let daysFromBackend = 10
  if(docSnap.exists)
      daysFromBackend = parseInt(docSnap.data().days, 10)

  const xDaysAfter = new Date(testDate.getTime() + daysFromBackend * 24 * 60 * 60 * 1000);
  return new Date() >= xDaysAfter;
}

// Helper function to check if the current day is a multiple of five
function isMultipleOfFive() {
  const today = new Date();
  const dayOfMonth = today.getDate();
  return dayOfMonth % 5 === 0;
}

// Schedule a job to run every day at 8:00 AM (server time)
cron.schedule("0 8 * * *", () =>{
      checkPatientsAndSendNotifications()
});

// Schedule a job to run every day at 5:00 PM (server time)
cron.schedule("39 22 * * *", () =>{
      console.log("Executing command")
      checkPatientsAndSendNotifications()
});




// Default error handling middleware that will show 404 when a route is not found
app.use ((req, res, next) => {
    const error = new Error("Not found");
    error.status = 404;
    next (error) ;
});

// Error handling middleware that will show the error with a status code
app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status (error.status || 500);
    res. json ({
    error: {
        message: error.message,
    },
    });
});

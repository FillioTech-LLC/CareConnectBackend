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




// ----------------------- TEST API Endpoints --------------------------------------------------------------------


// This method was created as a test to retrieve all patients from the database and to send it to the front end
// Se puede usar de referencia si tuviesemos que usar algo asi de nuevo
app.get(`/getAllPatients`, async (req, resp) => {
    try{
        const querySnapshot = await firestoreDatabase.getDocs(firestoreDatabase.collection(firestoreDatabase.db, "Patients"));
        const listOfPatientsFromDB = querySnapshot.docs.map(doc => ({
                    ...doc.data().patientInfo,
                    documentID: doc.id
                }))

        resp.status(200).send(listOfPatientsFromDB)
    }catch (error) {
        console.error("Error fetching patients:", error);
        resp.status(500).send({ error: "Failed to fetch patients." });
  }
})

// This method was created as a test to send notifications to the doctors when a patient has completed their tests
// Se puede usar de referencia si tuviesemos que usar algo asi de nuevo
app.post("/sendPatientCompletedNotification", async (req, res) => {
    // Create the messages array
    // let token = "ExponentPushToken[wOX2vLBx-1QT7gLI3YNG3i]" 
    const tokens = await getListOfTokensFromDB();
    let messages = [];
    const {patientRecordNumber} = req.body;
    const currentTime = new Date().toLocaleString("en-US", {
      timeZone: "America/Puerto_Rico",
    });
     if(!patientRecordNumber)
      return res.status(400).send("Patient record number is required");

    var notificationContent = {
        title: "Patient Has Completed Test",
        body: `Patient with record id "${patientRecordNumber}" has completed their test!`,
        date: currentTime,
    }

    await sendNotificationToUsers(notificationContent);

    res.status(200).send("Notification sent");
});


// ----------------------- TEST API Endpoints --------------------------------------------------------------------










async function getListOfTokensFromDB (){
 const querySnapshot = await firestoreDatabase.getDocs(firestoreDatabase.collection(firestoreDatabase.db, "Users"));
        const listOfUsersInDB = querySnapshot.docs.map(doc => ({
                    ...doc.data().userInfo,
                    documentID: doc.id
                }))
    let tokens = listOfUsersInDB.map(user => user.notificationPushToken).filter(token => token !== undefined);
    return tokens;
}

function getStringOfMissingPatients(listOfPatientWithMissingTests) {

   let stringOfMissingPatients = "";
   // Create a string of patient record numbers
   listOfPatientWithMissingTests.map((patient) => {
   let stringOfTestsMissing = "";
   patient.listOfTestOrderedButNotDelivered.map((testName) => {
      stringOfTestsMissing += `${testName}, `;
    });
    stringOfMissingPatients += `- ${patient.patientRecordNumber}, is missing the following tests: ${stringOfTestsMissing} \n`;
  });

  return stringOfMissingPatients;
}

// Function to determine whether a patient has not completed their tests
function isPatientMissingTestsAfterMonthOfAssigned(patient) {
  return (
    patient.allTestsCompleted === "no" &&
    hasMonthPassedFromGivenDate(new Date(patient.patientDateAssigned))
  );
}

function hasMonthPassedFromGivenDate(givenDate) {
  const currentDate = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(currentDate.getMonth() - 1);

  return givenDate <= oneMonthAgo;
}

// Function to check if patients are missing their tests and send notifications to the doctors letting them know of the patients that are missing tests
async function checkPatientsAndSendNotifications(){
  const currentTime = new Date().toLocaleString("en-US", {
    timeZone: "America/Puerto_Rico",
  });
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

      const listOfPatients = (await Promise.all(listOfPatientPromises)).filter(patient => patient.listOfTestOrderedButNotDelivered.length !== 0);
      if(listOfPatients.length !== 0){
          let stringOfMissingPatients = getStringOfMissingPatients(listOfPatients);

          var notificationContent = {
            title: "Patients with missing tests",
            body: `The following patients have not yet completed their tests: \n ${stringOfMissingPatients} \n Please remind the patients that they need to complete their tests.`,
            date: currentTime,
          };

          await sendNotificationToUsers(notificationContent);
    }

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

async function getPatientsThatHaveNotFinishedAllTestAfterFirstMonthOfAssigned() {
  // Fetch patients from Firestore
  const querySnapshot = await firestoreDatabase.getDocs(
    firestoreDatabase.collection(firestoreDatabase.db, "Patients")
  );

  // Map the results to an array of patient objects
  const patients = querySnapshot.docs.map((doc) => ({
    ...doc.data().patientInfo,
    documentID: doc.id,
  }));

  return patients.filter(isPatientMissingTestsAfterMonthOfAssigned);
}

function getStringOfPatientsThatHaveNotFinishedAllTest(listOfPatientsThatHaveNotFinishedAllTest) {
  let stringOfPatientsThatHaveNotFinishedAllTest = "";
  listOfPatientsThatHaveNotFinishedAllTest.map((patient) => {
    stringOfPatientsThatHaveNotFinishedAllTest += `- ${patient.patientRecordNumber} \n`;
  });

  return stringOfPatientsThatHaveNotFinishedAllTest;
}


async function sendNotificationToUsers(notification){

  await firestoreDatabase.addDoc(
    firestoreDatabase.collection(firestoreDatabase.db, "Notifications"),
    notification
  );

  // Fetch the list of tokens from the database
  const tokens = await getListOfTokensFromDB();

  let messages = [];
  await Promise.all(
    tokens.map(async (token) => {
      if (!Expo.isExpoPushToken(token)) {
        console.error("Invalid Expo push token:", token);
      } else {
        messages.push({
          to: token,
          sound: "default",
          title: notification.title,
          body: notification.body,
          data: { date: notification.date },
        });
      }
    })
  );

  // Send the notifications
  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];
  (async () => {
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Error sending notifications to doctors -> ", error);
      }
    }
  })();
}

async function sendMonthlyNotification(){
  const currentTime = new Date().toLocaleString("en-US", {
    timeZone: "America/Puerto_Rico",
  });

  const listOfPatientsThatHaveNotFinishedAllTest =
    await getPatientsThatHaveNotFinishedAllTestAfterFirstMonthOfAssigned();
  const stringOfPatients = getStringOfPatientsThatHaveNotFinishedAllTest(
    listOfPatientsThatHaveNotFinishedAllTest
  );

  if(stringOfPatients !== ""){
      const monthlyNotification = {
        title: "Incomplete Patient Tests",
        body: `The following patients were assigned over a month ago and have not yet completed their tests. \n ${stringOfPatients} \n Please review the patients to finish their tests.`,
        date: currentTime,
      };

      await sendNotificationToUsers(monthlyNotification);
  }
}








// ---------------------------- Cron Jobs --------------------------------------------------------------------



// Schedule a job to run every day at 8:00 AM Puerto Rico time.

// This cron job verifies every morning at 8am if there are any patients that have not completed 
// their tests within the time frame specified in the backend
cron.schedule("0 8 * * *", async () =>{
      console.log("Executing sending notifications to doctors at 8:00 PM");
      await checkPatientsAndSendNotifications()
},
{
  timezone: "America/Puerto_Rico",
});



// Schedule a job to run every day at 5:00 PM (server time)

// This cron job verifies every day at 5pm if there are any patients that have not completed
// their tests within the time frame specified in the backend
cron.schedule(
  "0 17 * * *",
  async () => {
    console.log("Executing sending notifications to doctors at 5:00 PM");
    await checkPatientsAndSendNotifications();
  },
  {
    timezone: "America/Puerto_Rico",
  }
);


// Schedule the monthly notification job

// This cron job verifies every month on the 1th at 8:00 AM if there are any patients that have taken 
// longer than one month to complete their test
cron.schedule(
  "0 8 1 * *",
  async () => {
    console.log("Executing monthly notification job");
    await sendMonthlyNotification();
  },
  {
    timezone: "America/Puerto_Rico", // Adjust the timezone if necessary
  }
);


// ---------------------------- Cron Jobs --------------------------------------------------------------------




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

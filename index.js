const {firestoreDatabase} = require("./Database/firebase");
const express = require("express"); 
const app = express();
const port = 8080;

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
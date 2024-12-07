const firebase = require("firebase")
const express = require("express"); 
const app = express();
const port = 8080;

app.use(express.json()) // Uses middleware to parse the JSON

app.listen(port, () => console.log(`its alive on http://localhost:${port}`))

app.get(`/tshirt`, (req, resp) => {
    console.log(firestoreDatabase)
    resp.status(200).send({
        tshirt: `👕`,
        size: "large"
    })
})
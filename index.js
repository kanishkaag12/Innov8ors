const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const aiRoutes = require("./routes/aiRoutes");

const app = express();

/* middleware */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* static files */
app.use(express.static(path.join(__dirname, "public")));

/* view engine */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* frontend page */
app.get("/", (req, res) => {
  res.render("index");
});

/* api routes */
app.use("/api", aiRoutes);

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
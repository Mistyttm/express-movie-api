var express = require("express");
var router = express.Router();

/* GET users listing. */
router.get("/", function(req, res, next) {
  res.send("respond with a resource");
});

router.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required"
    });

    console.log(`Error on request body:`, JSON.stringify(req.body));
  } else {
    const user = {
      email: req.body.email,
      password: req.body.password
    };
    req
      .db("users")
      .insert(user)
      .then(_ => {
        res.status(201).json({ message: "User created" });
        console.log(`successful user creation:`, JSON.stringify(user));
      })
      .catch(err => {
        res.status(409).json({ error: true, message: "User already exists" });
      });
  }
});

module.exports = router;

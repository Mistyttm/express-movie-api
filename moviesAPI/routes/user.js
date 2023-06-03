const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

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

router.post("/login", function(req, res, next) {
  if (!req.body.email || !req.body.password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, both email and password are required"
    });

    console.log(`Error on request body:`, JSON.stringify(req.body));
  } else {
    var expires_in_refresh = 60 * 60 * 24;
    var expires_in = 60 * 10;

    if (req.body.longExpiry === "true" || req.body.longExpiry === "True") {
      expires_in_refresh = 60 * 60 * 24;
      expires_in = 60 * 60 * 24;
    }

    if (req.body.bearerExpiresInSeconds && req.body.refreshExpiresInSeconds) {
      expires_in_refresh = parseInt(req.body.refreshExpiresInSeconds);
      expires_in = parseInt(req.body.bearerExpiresInSeconds);
    }

    const exp = Math.floor(Date.now() / 1000) + expires_in;
    const expRefresh = Math.floor(Date.now() / 1000) + expires_in_refresh;
    const bearerToken = jwt.sign({ exp }, JWT_SECRET);
    const refreshToken = jwt.sign({ expRefresh }, JWT_SECRET);

    req
      .db("users")
      .where("email", req.body.email)
      .update({ jwt: refreshToken })
      .then(() => {
        res.status(200).json({
          bearerToken: {
            bearerToken,
            token_type: "Bearer",
            expires_in
          },
          refreshToken: {
            refreshToken,
            token_type: "Refresh",
            expires_in_refresh
          }
        });
      })
      .catch(err => {
        res
          .status(401)
          .json({ error: true, message: "Incorrect email or password" });
      });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const authorization = require("../middleware/authorization");
var validateDate = require("validate-date");
const bcrypt = require('bcrypt');
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
    const saltedUser = bcrypt.hashSync(req.body.password, 10);
    const user = {
      email: req.body.email,
      password: saltedUser
    };
    req
      .db("users")
      .insert(user)
      .then(_ => {
        

        res.status(201).json({ message: "User created" });
        console.log(`successful user creation:`, JSON.stringify(user.email, saltedUser));
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

    if (req.body.bearerExpiresInSeconds) {
      expires_in = parseInt(req.body.bearerExpiresInSeconds);
    }

    if (req.body.refreshExpiresInSeconds) {
      expires_in_refresh = parseInt(req.body.refreshExpiresInSeconds);
    }

    const email = req.body.email;

    const exp = Math.floor(Date.now() / 1000) + expires_in;
    const expRefresh = Math.floor(Date.now() / 1000) + expires_in_refresh;
    const bearerToken = jwt.sign({ email, exp }, JWT_SECRET);
    const refreshToken = jwt.sign({ email, expRefresh }, JWT_SECRET);

    

    req
    .db("users")
    .select("password")
    .count("*")
    .where("email", email)
    .then(result => {
      const count = result[0]["count(*)"];
      const emailExists = count > 0;
      if (!emailExists) {
        return res.status(401).json({ error: true, message: "User not found" });
      } else {
        bcrypt.compare(req.body.password, result[0].password)
        .then(match => {
          if(!match){
            return res.status(401).json({ error: true, message: "Incorrect Password" });
          } else {
            req
              .db("users")
              .where("email", req.body.email)
              .update({ jwt: refreshToken })
              .then(() => {
                res.status(200).json({
                  bearerToken: {
                    token: bearerToken,
                    token_type: "Bearer",
                    expires_in
                  },
                  refreshToken: {
                    token: refreshToken,
                    token_type: "Refresh",
                    expires_in: expires_in_refresh
                  }
                });
              })
          }
      })
      .catch(err => {
        res
          .status(401)
          .json({ error: true, message: "Incorrect email or password" });
      });
      }
    });
  }
});

router.post("/refresh", function(req, res, next) {
  if (!req.body.refreshToken) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, refresh token required"
    });
  } else {
    try{
      jwt.verify(req.body.refreshToken, process.env.JWT_SECRET)
    } catch(e){
      return res
        .status(401)
        .json({ error: true, message: "Invalid JWT token" });
    }

    const decodedJWT = jwt.decode(req.body.refreshToken);
    const email = decodedJWT.email;
    var expires_in_refresh = 60 * 60 * 24;
    var expires_in = 60 * 10;
    const exp = Math.floor(Date.now() / 1000) + expires_in;
    const expRefresh = Math.floor(Date.now() / 1000) + expires_in_refresh;
    const bearerToken = jwt.sign({ email, exp }, JWT_SECRET);
    const refreshToken = jwt.sign({ email, expRefresh }, JWT_SECRET);

    

    if (decodedJWT.expRefresh < Math.floor(Date.now() / 1000)) {
      return res
        .status(401)
        .json({ error: true, message: "JWT token has expired" });
    } else {
      req
        .db("users")
        .where("email", email)
        .update({ jwt: refreshToken })
        .then(() => {
          res.status(200).json({
            bearerToken: {
              token: bearerToken,
              token_type: "Bearer",
              expires_in
            },
            refreshToken: {
              token: refreshToken,
              token_type: "Refresh",
              expires_in: expires_in_refresh
            }
          });
        });
    }
  }
});

router.post("/logout", function(req, res, next) {

  if (!req.body.refreshToken) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete, refresh token required"
    });
  } else {
    try{
      jwt.verify(req.body.refreshToken, process.env.JWT_SECRET)
    } catch(e){
      return res
        .status(401)
        .json({ error: true, message: "Invalid JWT token" });
    }
    const decodedJWT = jwt.decode(req.body.refreshToken);
    const email = decodedJWT.email;

    if (decodedJWT.expRefresh < Math.floor(Date.now() / 1000)) {
      return res
        .status(401)
        .json({ error: true, message: "JWT token has expired" });
    }

    req.db("users").where("email", email).update({ jwt: null }).then(() => {
      res.status(200).json({
        error: false,
        message: "Token successfully invalidated"
      });
    });
  }
});

router.put("/:email/profile", authorization, function(req, res, next) {
  const email = req.params.email;
  const cleanedToken = req.headers.authorization.substring(7);
  const decodedJWT = jwt.decode(cleanedToken);
  const JWTemail = decodedJWT.email;
  var validEmail = false;

  if (email !== JWTemail) {
    res.status(403).json({ error: true, message: "Forbidden" });
    return;
  }

  if (decodedJWT.expRefresh < Math.floor(Date.now() / 1000)) {
    return res
      .status(401)
      .json({ error: true, message: "JWT token has expired" });
  }

  if (
    !req.body.firstName ||
    !req.body.lastName ||
    !req.body.dob ||
    !req.body.address
  ) {
    return res.status(400).json({
      error: true,
      message:
        "Request body incomplete: firstName, lastName, dob and address are required."
    });
  }

  if (
    !(typeof req.body.firstName === "string") ||
    !(typeof req.body.lastName === "string") ||
    !(typeof req.body.dob === "string") ||
    !(typeof req.body.address === "string")
  ) {
    return res.status(400).json({
      error: true,
      message:
        "Request body invalid: firstName, lastName and address must be strings only."
    });
  }

  if (
    !validateDate(
      req.body.dob,
      responseType = "boolean",
      dateFormat = "yyyy-mm-dd"
    ) || !(/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})$/.test(req.body.dob))
  ) {
    return res.status(400).json({
      error: true,
      message: "Invalid input: dob must be a real date in format YYYY-MM-DD."
    });
  } else {
    const givenDate = new Date(req.body.dob);
    const currentDate = new Date();
    if (givenDate.getTime() > currentDate.getTime()) {
      return res.status(400).json({
        error: true,
        message: "Invalid input: dob must be a date in the past."
      });
    } else {
      req
    .db("users")
    .count("*")
    .where("email", email)
    .then(result => {
      const count = result[0]["count(*)"];
      const emailExists = count > 0;
      validEmail = true;
    })
    .catch(error => {
      return res.status(404).json({ error: true, message: "User not found" });
    });

  req
    .db("users")
    .where("email", email)
    .update({
      firstname: req.body.firstName,
      lastName: req.body.lastName,
      dob: req.body.dob,
      address: req.body.address
    })
    .then(() => {
      res.status(200).json({
        email: email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        dob: req.body.dob,
        address: req.body.address
      });
    });
    }
  }
});

router.get("/:email/profile", function(req, res, next) {
  var cleanedToken;
  var decodedJWT;
  
  try {
    cleanedToken = req.headers.authorization.substring(7);
    decodedJWT = jwt.decode(cleanedToken);
    if (decodedJWT.expRefresh < Math.floor(Date.now() / 1000)) {
      return res
        .status(401)
        .json({ error: true, message: "JWT token has expired" });
    } 
  } catch(e) {
    console.log("sad");
  }
  
  if(req.headers.authorized){
    if (!jwt.verify(cleanedToken, JWT_SECRET)) {
      return res.status(401).json({ error: true, message: "Invalid JWT token" });
    }
  }

  if (!("authorization" in req.headers) || decodedJWT.email !== req.params.email) {
    req
      .db("users")
      .count('*')
      .select("email", "firstName", "lastName")
      .where("email", req.params.email)
      .then(results => {
        const count = results[0]["count(*)"];
        const emailExists = count > 0;
        if (emailExists){
          res.status(200).json({
            email: results[0]?.email,
            firstName: results[0]?.firstName,
            lastName: results[0]?.lastName
          });
        } else {
          res.status(404).json({
            error: true,
            message: "User not found"
          })
        }
        
      });
    return;
  } else if (!req.headers.authorization.match(/^Bearer/)) {
    return res
      .status(401)
      .json({ error: true, message: "Authorization header is malformed" });
  } else {
    req
      .db("users")
      .select("email", "firstName", "lastName", "dob", "address")
      .where("email", req.params.email)
      .then(results => {
        res.status(200).json({
          email: results[0].email,
          firstName: results[0].firstName,
          lastName: results[0].lastName,
          dob: results[0].dob,
          address: results[0].address
        });
      })
      .catch(err => {
        return res.status(404).json({
          error: true,
          message: "User not found"
        });
      });
  }
});

module.exports = router;

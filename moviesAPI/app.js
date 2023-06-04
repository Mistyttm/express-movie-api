const env = require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/user");
const moviesRouter = require("./routes/movies");
const peopleRouter = require("./routes/people");

const app = express();

const options = require("./config/knexfile.js");
const { attachPaginate } = require("knex-paginate");
const knex = require("knex")(options);
const cors = require("cors");
attachPaginate();

const swaggerUI = require("swagger-ui-express");
const swaggerDocument = require("./docs/swagger-config.json");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  req.db = knex;
  next();
});
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

app.use("/", swaggerUI.serve);
app.get("/", swaggerUI.setup(swaggerDocument));
app.use("/user", usersRouter);
app.use("/movies", moviesRouter);
app.use("/people", peopleRouter);
app.get("/knex", function(req, res, next) {
  req.db
    .raw("SELECT VERSION()")
    .then(version => console.log(version[0][0]))
    .catch(err => {
      console.log(err);
      throw err;
    });
  res.send("Version Logged successfully");
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;

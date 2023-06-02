const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const moviesRouter = require("./routes/movies");

const app = express();

const options = require("./knexfile.js");
const { attachPaginate } = require("knex-paginate");
const knex = require("knex")(options);
attachPaginate();

const swaggerUI = require("swagger-ui-express");
const swaggerDocument = require("./docs/openapi.json");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  req.db = knex;
  next();
});

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/movies", moviesRouter);
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
app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

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

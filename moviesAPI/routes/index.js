var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", { title: "Express" });
});

router.get("/movies/search", function(req, res, next) {
  const { title, year, page } = req.query;
  const query = req.db
    .from("basics")
    .select(
      "primaryTitle AS title",
      "year",
      "tconst AS imdbID",
      "imdbRating",
      "rottentomatoesRating",
      "metacriticRating",
      "rated AS classification"
    );

  if (title !== undefined) {
    query.where("primaryTitle", "LIKE", `%${title}%`);
  }

  if (year !== undefined) {
    if (!/^\d{4}$/.test(year)) {
      return res.json({ Error: true, Message: "Invalid year format. Please use 'yyyy' format." });
    }
    query.where("year", "LIKE", `%${year}%`);
  }

  query.paginate({
      perPage: 100,
      currentPage: page || 1,
      isLengthAware: true
    })
    .then(rows => {
      res.json(rows);
    })
    .catch(err => {
      console.log(err);
      res.json({ Error: true, Message: "Error in MySQL query" });
    });
});

module.exports = router;

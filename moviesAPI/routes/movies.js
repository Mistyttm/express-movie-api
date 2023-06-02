var express = require("express");
var router = express.Router();

/* GET movies listing. */
router.get("/", function(req, res, next) {
  res.send("respond with a resource");
});

router.get("/search", function(req, res, next) {
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
      return res.status(400).json({
        Error: true,
        Message: "Invalid year format. Please use 'yyyy' format."
      });
    }
    query.where("year", "LIKE", `%${year}%`);
  }

  query
    .paginate({
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

router.get("/data/:imdbID", function(req, res, next) {
  const imdbID = req.params.imdbID;

  const query = req.db
    .from("basics")
    .select(
      "primaryTitle AS title",
      "year",
      "runtimeMinutes AS runtime",
      "genres",
      "country"
    )
    .where("tconst", "=", imdbID);

  const principals = req.db
    .from("principals")
    .select("nconst AS id", "category", "name", "characters")
    .as("principals")
    .where("tconst", "=", imdbID);

  const ratings = req.db
    .from("basics")
    .select("imdbRating", "rottentomatoesRating", "metacriticRating")
    .as("ratings")
    .where("tconst", "=", imdbID);

  const query2 = req.db
    .from("basics")
    .select("boxoffice", "poster", "plot")
    .where("tconst", "=", imdbID);

  if (Object.keys(req.query).length > 0) {
    const invalidParam = Object.keys(req.query)[0];
    res.status(400).json({ Error: true, Message: `Invalid query parameter: ${invalidParam}` });
    return;
  }

  Promise.all([query, principals, ratings, query2])
    .then(results => {
      const [queryResult, principalsResult, ratingsResult, query2Result] = results;

      if (queryResult.length === 0) {
        res.status(404).json({ Error: true, Message: "ID not found" });
        return;
      }

      const mergedResult = {
        ...queryResult[0],
        genres: queryResult[0].genres.split(",").map(genre => genre.trim()), // Convert the comma-separated string to an array
        principals: principalsResult,
        ratings: [
          {
            source: "Internet Movie Database",
            value: ratingsResult[0].imdbRating
          },
          {
            source: "Rotten Tomatoes",
            value: ratingsResult[0].rottentomatoesRating
          },
          {
            source: "Metacritic",
            value: ratingsResult[0].metacriticRating
          },
        ],
        ...query2Result[0]
      };

      res.json(mergedResult);
    })
    .catch(err => {
      console.log(err);
      res.json({ Error: true, Message: "Error in MySQL query" });
    });
});






module.exports = router;

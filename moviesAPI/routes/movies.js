var express = require("express");
var router = express.Router();

/* GET movies listing. */
router.get("/", function(req, res, next) {
  res.send("respond with a resource");
});

router.get("/search", function(req, res, next) {
  const { title, year } = req.query;
  let page = req.query.page;

  if (page === undefined) {
    page = 1;
  }
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
        error: true,
        message: "Invalid year format. Format must be yyyy."
      });
    }
    query.where("year", "LIKE", `%${year}%`);
  }

  if (isNaN(page) && page !== undefined) {
    return res.status(400).json({
      error: true,
      message: "Invalid page format. page must be a number."
    });
  } else {
  }

  var data = [];

  query
    .paginate({
      perPage: 100,
      currentPage: parseInt(page),
      isLengthAware: true
    })
    .then(rows => {
      rows.data.map(movie => {
        movieOb = {
          title: movie.title,
          year: movie.year,
          imdbID: movie.imdbID,
          imdbRating: parseFloat(movie.imdbRating),
          rottenTomatoesRating: parseInt(movie.rottentomatoesRating),
          metacriticRating: parseInt(movie.metacriticRating),
          classification: movie.classification
        };
        data.push(movieOb);
      });
      const pagination = rows.pagination;
      res.json({ data, pagination });
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
    res.status(400).json({
      error: true,
      message: `Query parameters are not permitted.`
    });
    return;
  }

  Promise.all([query, principals, ratings, query2])
    .then(results => {
      const [
        queryResult,
        principalsResult,
        ratingsResult,
        query2Result
      ] = results;

      if (queryResult.length === 0) {
        res.status(404).json({ error: true, message: "ID not found" });
        return;
      }

      const mergedResult = {
        ...queryResult[0],
        genres: queryResult[0].genres.split(",").map(genre => genre.trim()), // Convert the comma-separated string to an array
        principals: principalsResult.map(principal => {
          if (principal.characters !== "") {
            principal.characters = JSON.parse(principal.characters);
          }
          result = {
            id: principal.id,
            category: principal.category,
            name: principal.name,
            characters: principal.characters
          };
          return result;
        }),
        ratings: [
          {
            source: "Internet Movie Database",
            value: parseFloat(ratingsResult[0].imdbRating)
          },
          {
            source: "Rotten Tomatoes",
            value: parseInt(ratingsResult[0].rottentomatoesRating)
          },
          {
            source: "Metacritic",
            value: parseInt(ratingsResult[0].metacriticRating)
          }
        ],
        ...query2Result[0]
      };

      res.json(mergedResult);
    })
    .catch(err => {
      console.log(err);
      res.json({ error: true, message: "Error in MySQL query" });
    });
});

module.exports = router;

const express = require("express");
const router = express.Router();
const authorization = require("../middleware/authorization");

/* GET people listing. */
router.get("/", function(req, res, next) {
  res.send("respond with a resource");
});

router.get("/:id", authorization, function(req, res, next) {
  const id = req.params.id;

  if (Object.keys(req.query).length > 0) {
    const invalidParam = Object.keys(req.query)[0];
    res.status(400).json({
      error: true,
      message: `Query parameters are not permitted.`
    });
    return;
  }

  req.db("names").count("*").where("nconst", id).then(result => {
    const count = result[0]["count(*)"];
    const emailExists = count > 0;
    if (!emailExists) {
      return res
        .status(404)
        .json({ error: true, message: "Person does not exist" });
    } else {
      const query = req.db
        .from("names")
        .select("primaryName AS name", "birthYear", "deathYear")
        .where("nconst", "=", id);

      const roles = req.db
        .from("principals")
        .select(
          "basics.primaryTitle",
          "principals.tconst AS movieID",
          "principals.category",
          "principals.characters",
          "basics.imdbRating"
        )
        .leftJoin("basics", "principals.tconst", "=", "basics.tconst")
        .where("nconst", "=", id);

      Promise.all([query, roles])
        .then(results => {
          const [queryResults, rolesResults] = results;

          const mergedResult = {
            ...queryResults[0],
            roles: rolesResults.map(role => {
              if (role.characters !== "") {
                role.characters = JSON.parse(role.characters);
              }
              result = {
                movieName: role.primaryTitle,
                movieId: role.movieID,
                category: role.category,
                characters: role.characters,
                imdbRating: parseFloat(role.imdbRating)
              };
              return result;
            })
          };

          res.json(mergedResult);
        })
        .catch(err => {
          console.log(err);
          res.json({ Error: true, Message: "Error in MySQL query" });
        });
    }
  });
});

module.exports = router;

var express = require('express');
var router = express.Router();

/* GET people listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/:id', function(req, res, next) {
  const id = req.params.id;

  const query = req.db
    .from("names")
    .select("primaryName AS name", "birthYear", "deathYear")
    .where("nconst", "=", id);
  
  const roles = req.db
    .from("principals")
    .select("basics.primaryTitle", "principals.tconst AS movieID", "principals.category", "principals.characters", "basics.imdbRating")
    .leftJoin("basics", "principals.tconst", "=", "basics.tconst")
    .where("nconst", "=", id);
  
  Promise.all([query, roles])
    .then(results => {
      const [queryResults, rolesResults] = results;

      const mergedResult = {
        ...queryResults[0],
        roles: [
          {
            title: rolesResults[0].primaryTitle,
            movieID: rolesResults[0].movieID,
            category: rolesResults[0].category,
            characters: JSON.parse(rolesResults[0].characters),
            imdbRating: parseFloat(rolesResults[0].imdbRating)
          }
        ]
      };

      res.json(mergedResult);
    })
    .catch(err => {
      console.log(err);
      res.json({ Error: true, Message: "Error in MySQL query" });
    });
});

module.exports = router;

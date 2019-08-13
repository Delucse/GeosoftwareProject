var express = require('express');
var router = express.Router();

const authorizationCheck = require('../middleware/authorizationCheck');


/* GET home page. */
router.get('/', authorizationCheck, (req, res, next) => {
  res.render('index', { title: 'GeosoftwareProject' });
});

module.exports = router;

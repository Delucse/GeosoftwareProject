var express = require('express');
var router = express.Router();
const authorizationCheck = require('../middleware/authorizationCheck');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'GeosoftwareProject' });
});

module.exports = router;

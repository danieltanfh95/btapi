var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express'});
});

router.get('/series', function(req, res) {
  res.render('series', { title: 'Express'});
});

router.get('/category', function(req, res) {
  res.render('category', { title: 'Express'});
});

router.get('/time', function(req, res) {
  res.render('time', { title: 'Express'});
});

module.exports = router;

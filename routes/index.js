var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index.html');
});

router.get('/series', function(req, res) {
  res.render('series.html');
});

router.get('/category', function(req, res) {
  res.render('category.html');
});

router.get('/time', function(req, res) {
  res.render('time.html');
});

router.get('/genre', function(req, res) {
  res.render('genre.html');
});

router.get('/page', function(req, res) {
  res.render('page.html');
});

router.get('/reader', function(req, res) {
  res.render('webindex.html');
});

module.exports = router;

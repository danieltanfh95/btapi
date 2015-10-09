var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index');
});

router.get('/series', function(req, res) {
  res.render('series');
});

router.get('/category', function(req, res) {
  res.render('category');
});

router.get('/time', function(req, res) {
  res.render('time');
});

router.get('/genre', function(req, res) {
  res.render('genre');
});

router.get('/page', function(req, res) {
  res.render('page');
});

router.get('/reader', function(req, res) {
  res.render('webindex');
});

module.exports = router;

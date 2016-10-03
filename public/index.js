var fs = require("fs");
var browserify = require("browserify");
var babelify = require("babelify");
var uglifyify=require("uglifyify");
browserify("./src/app.jsx")
  .transform(babelify, {presets: ["es2015", "react"]})
  .transform('uglifyify')
  .bundle()
  .pipe(fs.createWriteStream("./js/bundle.js"));
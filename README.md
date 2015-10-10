## Baka Tsuki API

[![Join the chat at https://gitter.im/Shadowys/btapi](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/Shadowys/btapi?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Build Status](https://travis-ci.org/Shadowys/btapi.png?branch=master)](https://travis-ci.org/Shadowys/btapi)

[![](https://www.baka-tsuki.org/blog/wp-content/uploads/2012/04/logo.gif)](https://www.baka-tsuki.org/project/index.php?title=Main_Page)

This is the new API for [Baka Tsuki](https://www.baka-tsuki.org/project/index.php?title=Main_Page), based on the [original mediawiki API](https://www.baka-tsuki.org/project/api.php). 
This project is born out of :heart: for Baka Tsuki and also the #$%@#@ when trying to get any information out of the Baka Tsuki pages. There are just too many parsers but none of them can handle all the nearly random ways BT projects can be formatted.
It is currently hosted on Heroku [here](https://baka-tsuki-api.herokuapp.com/) but you can also host it yourself through NodeJS.

The API for the following has stabilised:
- [X] Getting data of novel series.
- [X] Search novel series by category.
- [X] Get latest update time of series or get a list of recently created pages.
- [X] Get the page of a certain interwiki title.

To do:
- [ ] Add method to get user data.
- [ ] Add method to push new changes to page.
- [ ] Add method to delete a page.

###Technologies
This API uses NodeJS, [ExpressJS](http://expressjs.com/) for the backend, [CheerioJS](http://cheeriojs.github.io/cheerio/) for quick and forgiving parsing and tranversing HTML, and [Nodemon](http://nodemon.io/) during development to reload code.

###Development
Clone the repo, or download the zip. Run `npm start` or `nodemon ./bin/www` to start the local server. Currently the main bulk of the logic lies in [`api.js`](https://github.com/Shadowys/btapi/blob/master/routes/api.js). 
Note that you may need some proficiency in jQuery to use Cheerio.

The API is now being used in an [iOS app for Baka Tsuki (still in development)](https://github.com/AzSiAz/LN-Reader). I am in the process of asking for permission to be hosted on Baka Tsuki itself.

###Contributing
Issues or features requests are welcome!

###Version History

1. 2015/10/1 : Version 1.0 is released.

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/Shadowys/btapi/trend.png)](https://bitdeli.com/free "Bitdeli Badge")


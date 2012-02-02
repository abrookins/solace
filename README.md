# Solace

This is a web app that lets the user search multiple Craigslist locations
simultaneously.

The front-end is written in CoffeeScript and is located in
`public/js/solace.coffee`. It offers some in-app features like caching via
localStorage and filtering (price, location and # of bedrooms depending on the
search type).

The back-end is written in Python, using Flask, in `solace.py`. It proxies
searches from the front-end to Craigslist, then scrapes the result and returns
JSONP data.

You can run the app at http://solace.herokuapp.com.

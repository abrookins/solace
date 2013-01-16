# Solace

This is a web app that lets the user search multiple Craigslist locations
simultaneously. Its IP was banned from Craigslist in 2013, turning this
repo into a relic of a better age.

The front-end is written in CoffeeScript and is located in
`public/js/solace.coffee`. It offers client-side features like caching via
localStorage and filtering (price, location and # of bedrooms depending on the
search type).

The back-end is written in Python, using Flask, in `solace.py`. It proxies
searches from the front-end to Craigslist via the `craigslist` library, 
which scrapes the results. The web serivce then returns JSONP data.

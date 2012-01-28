# Find Solace!

This is a web app that lets the user search multiple Craigslist locations
simultaneously. 

I wrote it to experiment with CoffeeScript. The first version used Sinatra as
the back-end and queried YQL for Craigslist data in the front-end. However, the
YQL search was too limited, so I wrote this version, which uses Python (Flask)
for the back-end and scrapes Craigslist directly for search results.

I assume Craigslist will block the app eventually, but in the meantime you can
run it at http://solace.heroku.com.

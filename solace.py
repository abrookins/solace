"""
solace: A Flask app that proxies multiple-location searches to Craigslist and
returns the results via JSONP.

Copyright (c) 2012 Andrew Brookins. All Rights Reserved.
"""
import decorators
import craigslist
import json
import flask
import os

from flask_cache import Cache


app = flask.Flask(__name__)
app.config.from_object('default_settings')
app.config.from_envvar('SOLACE_SETTINGS')

cache = Cache(app)


# Serve static files if in debug mode.
if app.config['DEBUG']:
    from werkzeug import SharedDataMiddleware
    app.wsgi_app = SharedDataMiddleware(app.wsgi_app, {
      '/': os.path.join(os.path.dirname(__file__), 'public')
    })


@cache.memoize()
def get_craigslist_locations():
    """
    Load the JSON fixtures file of all known Craigslist locations and return it.
    """
    with open('fixtures/locations.json') as locations_file:
        return locations_file.read()


def get_filters(params):
    """
    Extract a dictionary containing any valid filters found in ``params``, a
    dict of  GET parameters.
    """
    filters = {}

    if 'min_price' in params:
        filters['min_price'] = float(params['min_price'])
    if 'max_price' in params:
        filters['max_price'] = float(params['max_price'])
    if 'min_rooms' in params:
        filters['min_rooms'] = int(params['min_rooms'])
    if 'max_rooms' in params:
        filters['max_rooms'] = int(params['max_rooms'])


    return filters


CRAIGSLIST_LOCATIONS_JSON = get_craigslist_locations()
CRAIGSLIST_LOCATIONS = json.loads(CRAIGSLIST_LOCATIONS_JSON)


@app.route('/')
def index():
    """
    Load the index template, including all known Craigslist locations embedded
    as a JavaScript object on the page. This cuts down on AJAX calls back to the
    server for the initial page load.
    """
    cities = CRAIGSLIST_LOCATIONS['cities'].keys()
    cities.sort(
        key=lambda city: city if ',' not in city else city.split(',')[1])

    return flask.render_template(
        'index.html',
        craigslist_cities=cities,
        craigslist_locations=CRAIGSLIST_LOCATIONS_JSON)


@cache.memoize(timeout=50)
@decorators.jsonp
@app.route('/search')
def search():
    """
    Search for Craigslist locations and return the result as a JSON string.
    Returns an object with the following structure:

       {
        'result':
         'location': [item1, item2, ...]
       }

    If the user searched for multiple locations, the object will have a key for
    each location, e.g.:

       {
        'result':
         'location1': [item1, item2, ...],
         'location2': [item1, item2, ...]
       }
    """
    args = flask.request.args
    locations = args.getlist('location')
    category = args.get('type', None)
    query = args.get('q', None)
    filters = get_filters(args)
    listings = {}

    if query and locations and category:
        for location in locations:
            listings[location] = craigslist.search(location, category, query,
                                                   filters=filters)

    return flask.jsonify(result=listings)


if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)

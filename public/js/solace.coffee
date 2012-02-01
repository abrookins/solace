# *Solace* is a web app that allows the user to search across multiple
# Craigslist locations simultaneously.
#
# The front-end is written in CoffeeScript and uses Backbone.js to separate
# components between models, views and routers (see the [Backbone.js
# FAQ](http://documentcloud.github.com/backbone/#FAQ-mvc) for an explanation of
# *views* in Backbone.js versus in traditional MVC).
#
# The back-end is a Flask service that parses available locations from
# Craigslist.
#
# Full source code for the app is on
# [Github](https://github.com/abrookins/solace).


# Create a global namespace for the app.
window.solace = {}


# Handle an AJAX error.
# TODO: Better error-handling.
window.solace.handleAjaxError = (xhr, status, error) ->
  console.log(xhr, status, error)


#### CraigslistSearch ####
# A Craigslist search. On success, parses the resulting items and caches itself
# as JSON in localStorage, keyed to the URL of the search.
class CraigslistSearch extends Backbone.Model
  initialize: (options) ->
    @createdAt = null
    @result = options.result or {}
    @url = options.url
    @query = options.query
    @type = options.type
    @locations = options.locations
    @cachedResult = options.cachedResult
    @searchCacheKey = options.searchCacheKey
    @cacheTtl = 3600000 # one hour

  # The attributes to return for this object when calling JSON.stringify,
  # conforming with the JSON API:
  # (https://developer.mozilla.org/en/JSON#toJSON()_method)
  toJSON: ->
    url: @url
    type: @type
    query: @query
    result: @result
    locations: @locations
    cacheTtl: @cacheTtl

  fromJSON: (json) ->
    obj = JSON.parse(json)

    return new CraigslistSearch
      url: obj.url
      query: obj.query
      type: obj.type
      result: obj.result
      locations: obj.locations
      cacheTtl: obj.cacheTtl
      cachedResult: true

  # Run the search and trigger 'searchFinished' when complete. If this search
  # was reinstantiated from a cache, then finish immediately without hitting
  # the server.
  run: ->
    if @cachedResult
      @trigger('searchFinished')
    else
      $.ajax
        type: "GET"
        url: @url
        dataType: 'json'
        error: window.solace.handleAjaxError
        success: (data) =>
          if data.result
            @result.items = data.result
            @result.created = new Date().toUTCString()
            @cacheResult()
          @trigger('searchFinished')

  getCreatedAtTime: ->
    result = @.get('result')
    if result 
      return Date.parse(result.created)

  # Save a search in localStorage. Searches are stored with a key that is the
  # solace search URL and values are a JSON stringified `CraigslistSearch`, e.g.:
  #
  #       'http://solace.heroku.com/somesearchstring/etc': json-string-value
  #
  # A search is only stored once in this scheme, and saving a search for the
  # same keywords and locations overwrites a previously saved search.
  #
  # Note that the result of the search is stored, not just the search criteria.
  cacheResult: =>
    return unless localStorage

    # Log an error - probably out of space. TODO: Handle this better.
    try
      localStorage.setItem(@searchCacheKey+@url, JSON.stringify(@))
    catch e
      if e.name == 'QUOTA_EXCEEDED_ERR' 
        console.log('Could not cache result: Out of space in localStorage.')
        return

  # Parse the Craigslist subdomain from a URL.
  parseSubdomain: (url) ->
    return url.split('.')[0].substr(7);


#### Craigslist ####
# An object that builds search queries for user-specified keywords and
# Craigslist locations and returns `CraigslistSearch` objects.
class Craigslist extends Backbone.Model
  initialize: (options) ->
    @searchCacheKey = 'searchCache'
    @baseUrl = "/search"

  # Build a query string in the format:
  #     "key=values[0]&key=values[1]&key=values[2] ..."
  buildQueryString: (key, values) ->
    return ("#{key}=#{encodeURIComponent(val)}" for val in values).join('&')

  # Build the full search query URL.
  #
  # Takes an array of human-readable location names `locationNames` (the
  # locations the user chose on the search form), the type the user chose, and
  # the user's query.
  #
  # Returns a URL string.
  buildQueryUrl: (locationNames, type, query) ->
    locationQuery = @buildQueryString('location', locationNames)
    typeQuery = @buildQueryString('type', [type])

    # Craigslist expects spaces to be encoded with '+' because this data
    # supposedly comes from a form on their site.
    encodedQuery = encodeURIComponent(query.replace(' ', '+'))

    return "#{@baseUrl}?#{locationQuery}&#{typeQuery}&q=#{encodedQuery}"

  # Use the back-end web service to search Craigslist for a query in the chosen
  # locations.
  search: (options) ->
    url = @buildQueryUrl(options.locations, options.type, options.query)
    result = @getSearchFromCache(url)

    if not result
      result = new CraigslistSearch
        url: url
        type: options.type
        query: options.query
        locations: options.locations
        searchCacheKey: @searchCacheKey

    return result

  # Look for a cached search result for this URL. If a cached result exists,
  # check its TTL and return it if valid; otherwise delete the cached result and
  # return nothing.
  getSearchFromCache: (url) ->
    return unless localStorage
    json = localStorage.getItem(@searchCacheKey+url)

    if json
      search = new CraigslistSearch().fromJSON(json)
      diff = new Date().getTime() - search.getCreatedAtTime()

      if diff <= search.cacheTtl
        return search
      else
        localStorage.removeItem(@searchCacheKey+url)

  clearSearchCache: () ->
    return unless localStorage

    for key, val of localStorage
      if key.search(@searcCacheKey) == 0
        localStorage.removeItem(key)

  getCachedSearches: () ->
    return unless localStorage

    cachedSearches = {}

    for key, val of localStorage
      if key.search(@searchCacheKey) == 0
        cachedSearches[key] = new CraigslistSearch().fromJSON(val)

    return cachedSearches


#### ItemView ####
class ItemView extends Backbone.View
  initialize: (options) ->
    @item = options.item
    @ul = options.ul
    @li = null
    @render()

  render: ->
    title = "#{@item.date} - #{@item.desc} #{@item.location}"

    if @item.price
      title = "#{title} - $#{@item.price}"

    @li = $('<li>').appendTo(@ul)

    $("<a>").attr({
      href: @item.link,
      title: title
      target: "_blank"
    }).text(title).appendTo(@li)

  remove: ->
    @li.remove() 

  hide: ->
    @li.addClass('hidden')

  show: ->
    @li.removeClass('hidden')


#### AppView ####
# The main view for the app: autocomplete, form behavior.
class AppView extends Backbone.View
  initialize: (options) ->
    @router = options.router
    @initComplete = false
    @locationsDiv = $('#locations')
    @locationInput = $('#location')
    @searchForm = $('#search-form')
    @searchButton = $('#submit')
    @searchIcon = '/icons/search.png'
    @loadingIcon = '/images/ajax-loader.gif'
    @maxSearchRetry = 3
    @locations = options.locations
    @locationsReversed = {}
    @locationsReversed[url] = city for city, url of @locations['cities']
    @craigslist = new Craigslist

    # TODO: This should be a Collection.
    @itemViews = []

    $('#submit').live('click', @handleSearchClick)

    $('#clear-history').live('click', @clearSavedSearches)

    # Focus the obscured input field.
    @locationsDiv.live('click', () => @locationInput.focus())

    # Remove a tag when user clicks 'X'
    $(".remove", @locationsDiv).live("click", @removeLocation)
 
    # On focus and on click display the dropdown, and change the arrow image
    @searchForm.find('.searchbox-input').live(
      'focus click', @showSearchDropdown)
 
    # Close the search box when user hits 'x' 
    $('#close-search').live('click', @hideSearchDropdown)

    # Keyboard shortcuts
    $(document).keydown(@handleKeydown)

    @startAutocomplete()

  # Was a Command or Control key combo pressed, e.g., Command+/
  hasValidModifierKey: (keyEvent) ->
    switch keyEvent.which
      # Cmd, Cmd, Ctrl
      when 91, 93, 17
        return true
      else
        return false

  # Handle keyboard presses - for keyboard shortcuts.
  handleKeydown: (e) =>
    hasValidModifier = @hasValidModifierKey(e)
    if hasValidModifier
      @validModifierKeyPressed or= hasValidModifier
    else
      @receiveKey(e)

  receiveKey: (keyEvent) =>
    switch keyEvent.which
      when 191
        if @validModifierKeyPressed
          if $('ul.searchbox-dropdown').is(':visible')
            @hideSearchDropdown()
          else
            $('#query').focus()
          @validModifierKeyPressed = false

  # Show the search dropdown menu with location and type options.
  showSearchDropdown: =>
    @searchForm.find('.searchbox-dropdown').show()

  # Hide the search dropdown menu.
  hideSearchDropdown: =>
    @searchForm.find('.searchbox-dropdown').hide()

  # Load a jQuery autocomplete widget containing search locations.
  #
  # Triggers the 'initComplete' event, which the router waits for before 
  # sending search criteria encoded in the current URL (if any were passed in).
  startAutocomplete: =>
    cities = (city for city, _ of @locations['cities'])
    cities.sort()

    @locationInput.autocomplete(
      # Ignore the domain portion of the city during autocomplete.
      source: cities

      select: (el, ui) =>
        @addSearchLocation(ui.item.value)
        @clearLocation

      change: @clearLocation
      close: @clearLocation
    )

    # Clicking on the location box will trigger an empty search, dropping
    # down a list of all locations.
    @locationInput.focus(() =>
      @locationInput.autocomplete('search', ' '))

    @locationInput.click(() =>
      @locationInput.autocomplete('search', ' '))

    @initComplete = true
    @trigger('initComplete')

  # Add a location name to the location search div as a formatted span, with an
  # 'X' that the user can click to remove it.
  addSearchLocation: (locationName) ->
    span = $("<span>")
    span.text(locationName)

    a = $("<a>").addClass("remove").attr({
      href: "javascript:",
      title: "Remove " + location
    }).text("x").appendTo(span)

    # Add location to locations div
    span.appendTo(@locationsDiv)

  # Clear the faux location input.
  clearLocation: => 
    @locationInput.val('')

  # Clear the user's chosen locations.
  clearChosenLocations: ->
    $('#locations').children('span').remove()

  # Set search button background with loading spinner.
  showLoadingIcon: ->
    @searchButton.css(
      'background', "#F2F2F2 url(#{@loadingIcon}) no-repeat center center")

  # Set search button background to the magnifying glass/search indicator.
  showSearchIcon: ->
    @searchButton.css(
      'background', "#F2F2F2 url(#{@searchIcon}) no-repeat center center")

  # Get the locations the user chose on the search form.
  getSearchLocations: ->
    # Get a unique list of locations the user chose.
    locations = _.uniq(
      $(l).text() for l in @locationsDiv.children('span'))
    
    # Create an array of strings in the form 'location={url}' suitable for
    # joining and stuffing into a search URL.
    # Each location in `locations` will have an 'x' that we need to slice off.
    return ("location=#{loc.slice(0, loc.length-1)}" for loc in locations)

  # Transform the user's chosen locations into an array of CraigsList location
  # URLs, e.g. 'http://portland.craigslist.org', that we can pass to the server.
  getLocationUrls: (locations) ->
    # Get Craiglist URLs for the locations.
    # @locations['cities'] is a map of city names to CraigsList URLs.
    return (@locations['cities'][loc] for loc in locations)

  # Search for the user's query in the chosen locations.
  #
  # Passes the search type, query and locations to a Craigslist instance and
  # binds to the object's 'searchFinished' event, so the AppView can refresh
  # when it has results.
  search: (locations, type, query) =>
    # Perform the search immediately if the app view is loaded. Otherwise, bind
    # to initComplete and search when initialization has finished.
    if not @initComplete
      @bind('initComplete', () => @search(locations, type, query))
      return

    @setFormElements(locations, type, query)
    @showLoadingIcon()
    locationUrls = @getLocationUrls(locations)

    @lastSearch = @craigslist.search
      type: type
      query: query
      locations: locationUrls

    @lastSearch.bind('searchFinished', @displaySearchResults)
    @lastSearch.run()

  # Retry the last search and increase the @retryCount
  retryLastSearch: ->
    if @lastSearch and @retryCount <= @maxSearchRetry
      @retryCount += 1
      @search(@lastSearch.locations, @astSearch.type, @lastSearch.query)
    else
      alert('Oops, we could not complete the search! Try again later.')

  # Build a front-end search URL used for navigation and caching purposes from
  # an existing CraigslistSearch object `search`.
  buildUrlForExistingSearch: (search) ->
    locations = @getLocationNamesForUrls(search.locations)
    return '/#'+@buildSearchUrl(locations, search.type, search.query)

  # Return everything needed for a front-end search URL given a `locations` (an
  # array of human-readable location names), `type` (a string like 'jjj') and
  # `query` (the user's search), except the '/#/search/' portion.
  buildSearchUrlFragment: (locations, type, query) ->
    encodedType = encodeURIComponent(type)
    encodedLocations = encodeURIComponent(locations.join('&'))
    encodedQuery = encodeURIComponent(query)
    return "#{encodedLocations}/#{encodedType}/#{encodedQuery}"

  # Build a front-end search URL.
  buildSearchUrl: (locations, type, query) ->
    searchFragment = @buildSearchUrlFragment(locations, type, query)
    return "/search/#{searchFragment}"

  # Handle a user-initiated search via the search form.
  #
  # Encodes the search as a URI and navigates to it with the Router. Thus the
  # URI passes to the router (and through the History API) before coming back to
  # the AppView and then going on to a Craigslist instance.
  handleSearchClick: (event) =>
    event.preventDefault()
    query = $('#query').val()
    type = $('#type').val()
    locations = @getSearchLocations()

    # On Chrome, the following code will allow the browser's form validation
    # engine to kick in if we don't have all required values for a search.
    # TODO: Cross-browser form field validation.
    if query and type and locations.length > 0
      @hideSearchDropdown()
      # Autocomplete menu items sometimes hang out, so hide the menu.
      $('ul.ui-autocomplete').hide()
      searchUrl = @buildSearchUrl(locations, type, query)
      @router.navigate(searchUrl)
   
  # Remove a location from the location div.
  removeLocation: () ->
    $(@).parent().remove()

    if @locationsDiv.children('span').length == 0
      @locationInput.css("top", 0)

  # When a Craigslist instance has results, display them on the page,
  # separated by headers for each location the user searched.
  displaySearchResults: =>
    @showSearchIcon()
    prices = []
    rooms = []

    if not @lastSearch.result.items
      @retryLastSearch()
    else
      @retryCount = 0

    # TODO: Refactor other sections so we can call @clearItems() elsewhere.
    @clearItems()
    @displaySection(@lastSearch.type)
  
    resultType = $('#'+@lastSearch.type).children('.items')
    locationNav = $('ul#locationNav')

    # Show the location separator
    $('#locationSeparator').removeClass('hidden')

    $('<p>').text("Searching for '#{@lastSearch.query}.'").appendTo(resultType)

    for location, items of @lastSearch.result.items
      locationName = @locationsReversed[location]
      locationHeader = $('<h3>')
      locationHeader.text(locationName)

      # Create an anchor for this location and add a link to the location in
      # the sidebar.
      $('<a>').attr({
        name: "#{encodeURIComponent(locationName)}",
      }).prependTo(locationHeader)

      li = $('<li>').appendTo(locationNav)

      $('<a>').attr({
        href: "##{encodeURIComponent(locationName)}",
        title: locationName,
      }).text(locationName).appendTo(li)

      locationHeader.appendTo(resultType)
      ul = $('<ul>').appendTo(resultType)

      for item in items
        if item.price
          prices.push(item.price)
        if item.bedrooms
          rooms.push(item.bedrooms)

        @itemViews.push(new ItemView(
          item: item
          ul: ul
        ))

      if @itemViews.length == 0
        $("<p>").text("No results for this location.").appendTo(resultType)

    # Display search facets if appropriate.
    if prices.length > 0
      @displayPriceFacet(prices)
    if rooms.length > 0
      @displayRoomCountFacet(rooms)

  # Return a count of the number of `values` in each number of `groups`,
  # assuming both arguments are arrays of numbers.
  getFacetCounts: (availableGroups, values) ->
    groups = [0]
    min = _.min(values)
    max = _.max(values)

    # Make  the minimum value the head of the array and the max the tail.
    availableGroups.unshift(min)
    availableGroups.push(max)

    for group in availableGroups
      if group > min then groups.push(group) else continue

    counts = {}
    counts[group] = 0 for group in groups

    for val, i in values
      for groupUpperBound in groups
        if val < groupUpperBound
          counts[groupUpperBound] += 1
          break

    return counts

  # Add an 'All' link to the sidebar that will reset current filters.
  # TODO: Can I have a separate route for this?
  addResetFilterNavItem: (search) ->
    $('#resetSeparator').removeClass('hidden')
    resetNav = $('ul#resetNav')
    resetNav.children('li').empty()
    li = $('<li>').appendTo(resetNav)
    @buildLink("/#/filter/all/all/all/#{search}", 'All').appendTo(li)

  # A helper method to create a <a> element.
  buildLink: (href, text) ->
    return $('<a>').attr({
      href: href,
      title: text,
    }).text(text)

  # Allow the user to filter search results based on the number of rooms each
  # item has (for, e.g., a housing search).
  displayRoomCountFacet: (rooms) ->
    roomNav = $('ul#roomNav')
    locationNames = @getLocationNamesForUrls(@lastSearch.locations)
    search = @buildSearchUrlFragment(
      locationNames, @lastSearch.type, @lastSearch.query)
    roomCounts = @getFacetCounts([1, 2, 3, 4, 5], rooms)
    roomUpperBounds = _.keys(roomCounts)

    # Show the room separator
    $('#roomSeparator').removeClass('hidden')

    for upperBound, i in roomUpperBounds
      if upperBound == 0 or roomCounts[upperBound] == 0
        continue

      min = roomUpperBounds[i-1]
      linkText = "#{min}br - #{upperBound}br (#{roomCounts[upperBound]})"
      li = $('<li>').appendTo(roomNav)
      @buildLink("/#/filter/bedrooms/#{min}/#{upperBound}/#{search}", linkText)
        .appendTo(li)

    @addResetFilterNavItem(search)

  # Display price facets given an array of numbers, `prices`.
  displayPriceFacet: (prices) ->
    priceNav = $('ul#priceNav')
    minPrice = _.min(prices)
    locationNames = @getLocationNamesForUrls(@lastSearch.locations)
    search = @buildSearchUrlFragment(
      locationNames, @lastSearch.type, @lastSearch.query)

    availablePriceGroups = [50, 250, 500, 1000, 2000, 5000, 20000,
                            50000, 100000, 150000, 200000, 400000, 600000,
                            1000000]

    priceCounts = @getFacetCounts(availablePriceGroups, prices)
    priceUpperBounds = _.keys(priceCounts)

    # Show the price separator
    $('#priceSeparator').removeClass('hidden')

    for upperBound, i in priceUpperBounds
      if upperBound == 0 or priceCounts[upperBound] == 0
        continue

      min = priceUpperBounds[i-1]
      linkText = "$#{min} - $#{upperBound} (#{priceCounts[upperBound]})"
      li = $('<li>').appendTo(priceNav)
      @buildLink("/#/filter/price/#{min}/#{upperBound}/#{search}", linkText)
        .appendTo(li)

    @addResetFilterNavItem(search)

  # Set the search box form elements to the given parameters.
  #
  # This is called when the app receives a search query URI when the app is
  # unitialized, usually from a bookmark or saved search.
  setFormElements: (locations, type, query) =>
    @clearLocation()
    @clearChosenLocations()

    for loc in locations
      @addSearchLocation(loc)

    $('#type').val(type)
    $('#query').val(query)

  # Clear location and price links and separator lines in the sidebar.
  clearSidebar: ->
    $('ul#locationNav li').remove()
    $('ul#roomNav li').remove()
    $('ul#priceNav li').remove()
    $('ul#resetNav li').remove()
    # Hide any separator lines
    $('#sidebar div.separator').addClass('hidden')

  clearSavedSearches: =>
    historyDiv = $('#history')
    historyItems = historyDiv.children('.items')
    successDiv = historyDiv.children('div.success-message')
    successDiv.fadeIn(200).delay(4000).fadeOut(200)
    historyItems.empty()
    @craigslist.clearSearchCache()

  # Transform the URL of the location into a human-readable location name.
  getLocationNamesForUrls: (locationUrls) ->
    return (@locationsReversed[url] for url in locationUrls)

  # Show a list of the user's past searches and let them reopen a search.
  displaySavedSearches: ->
    if not @initComplete
      @bind('initComplete', () => @displaySavedSearches())
      return

    savedSearches = @craigslist.getCachedSearches()
    historyItems = $('#history').children('.items')

    @displaySection('history')

    if savedSearches
      ol = $('<ol>').appendTo(historyItems)

      for url, search of savedSearches
        li = $('<li>').appendTo(ol)
        locations = @getLocationNamesForUrls(search.locations)
        type = $('#'+search.type).children('h2').text()
        title = "#{type} matching '#{search.query}' in: #{locations.join('; ')}"
        url = @buildUrlForExistingSearch(search)

        $("<a>").attr({
          href: url,
          title: title
        }).text(title).appendTo(li)
    else
      $("<p>").text("No past searches on record.").appendTo(history)

  # Clear search results and section content.
  clearItems: () ->
    # Remove any ItemViews created by the last search.
    for item in @itemViews
      item.remove()
      delete(item)

    @itemViews = []

  displayHelp: ->
    @displaySection('help')

  displayIndex: ->
    @displaySection('welcome')

  displaySection: (sectionId) ->
    listingDiv = $('#result-listing')
    listingDiv.removeClass('hidden')
    sectionDiv = $('#'+sectionId)
    sectionItems = sectionDiv.children('.items')

    # Clear section content (search results, etc.).
    # Ideally this would be a call to @clearItems(), but only search uses a
    # View class to render individual content items, so here we remove children
    # of div.items manually. TODO: Fix this.
    $('#result-listing div.items').empty()

    @clearSidebar()

    # Hide divs other than the chosen section div.
    $('#result-listing div').addClass('hidden')
    sectionDiv.removeClass('hidden')
    sectionItems.removeClass('hidden')

  # Parse the locations from a URL-encoded array of locations, as passed by the
  # locations form when constructing search URLs.
  parseSearchLocations: (locationString) ->
    return (l.replace('location=', '') for l in locationString.split('&'))

  # Filter search results by values in `options`.
  # Only supports 'minPrice' and 'maxPrice' at present.
  filter: (options) ->
    if not @initComplete
      @bind('initComplete', () => @filter(options))
      return

    if options.min == 'all'
      min = 'all'
      max = null
    else
      min = parseFloat(options.min)
      max = parseFloat(options.max)

    for view in @itemViews
      val = view.item[options.field]

      if min == 'all' or val >= min and val < max 
        view.show()
      else
        view.hide()


#### Router ####
# Handle page navigation with back/forward support.
# See: (http://documentcloud.github.com/backbone/#Router)
class Router extends Backbone.Router
  routes:
    '': 'index'
    'search/:locations/:type/:query': 'search'
    'history': 'history'
    'help': 'help'
    'filter/:field/:min/:max/:locations/:type/:query': 'filter'

  initialize: (options) ->
    @app = new AppView
      router: @
      locations: options.locations

  index: =>
    @app.displayIndex()

  # Handle a search encoded as a URI.
  #
  # Multiple locations are specified as 'location=locationName' in the URI, so
  # first we split the parameters of the search and create an array of location
  # names.
  search: (locationQuery, type, query) =>
    parsedLocations = @app.parseSearchLocations(locationQuery)
    @app.search(parsedLocations, type, query)

  # Show list of past searches.
  history: =>
    @app.displaySavedSearches()

  # Show help page.
  help: =>
    @app.displayHelp()

  # Filter search results by `min` (number) and `max` (number) of `field`
  # (string - a property name of the result's CraigslistSearch).
  #
  # A search fragment is tacked onto the URL in `locations`, `type` and `query`
  # in order to make filtered URLs bookmarkable; IE, in that case the search
  # must be performed again, before the filter is applied.
  filter: (field, min, max, locations, type, query) ->
    # Search using the given parameters if a search isn't in progress.
    if not @app.lastSearch
      @search(locations, type, query)

    @app.filter(
      field: field
      min: min
      max: max
    )


window.solace.Router = Router
window.solace.AppView = AppView
window.solace.CraigslistSearch = CraigslistSearch


define([
  'jquery',
  'lib/underscore',
  'lib/backbone',
  'models'
  'lib/chosen.jquery'
], ($, _, Backbone, models) ->

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
      @locationsDiv = $('.location-container')
      @locationInput = $('.location')
      @searchForm = $('.search')
      @searchButton = @searchForm.find('.btn')
      @maxSearchRetry = 3
      @locations = options.locations
      @locationsReversed = {}
      @locationsReversed[url] = city for city, url of @locations['cities']
      @craigslist = new models.Craigslist
      @searchClicked = false

      # TODO: This should be a Collection.
      @itemViews = []

      @searchButton.live('click', @handleSearchClick)
      $('#clear-history').live('click', @clearSavedSearches)

      # Stop the 'X' button on locations from closing the search box.
      $('.search-choice-close').live('click', (e) ->
        e.stopPropagation()
      )

      $('.search-menu, .search-menu > form').live('click', (e) ->
        e.stopPropagation()
      )

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
        # Forward-slash (/) key.
        when 191
          if @validModifierKeyPressed
            $('.query').focus()
          @validModifierKeyPressed = false

    # Load a Chosen autocomplete widget containing search locations.
    #
    # Triggers the 'initComplete' event, which the router waits for before
    # sending search criteria encoded in the current URL (if any were passed in).
    startAutocomplete: =>
      @locationInput.chosen()
      @initComplete = true
      @trigger('initComplete')

    # Add a location name to the location search div as a formatted span, with an
    # 'X' that the user can click to remove it.
    addSearchLocation: (locationName) ->
      li = $('.active-result:contains("' + locationName + '")')
      item_id = li.attr('id')
      position = item_id.substr(item_id.lastIndexOf("_") + 1)
      chosen = @locationInput.data('chosen')
      item = chosen.results_data[position];
      item.selected = true;
      chosen.choice_build(item)

    # Clear the faux location input.
    clearLocation: =>
      @locationInput.val('')

    # Clear the user's chosen locations.
    clearChosenLocations: ->
      $('#locations').children('span').remove()

    # Set search button background with loading spinner.
    showLoadingIcon: ->
      @searchButton.addClass('loading')

    hideLoadingIcon: ->
       @searchButton.removeClass('loading')

    # Hide the search dropdown menu.
    toggleSearchDropdown: =>
      $('#search-menu').dropdown('toggle');

    # Get the locations the user chose on the search form.
    getSearchLocations: ->
      # Get a unique list of locations the user chose.
      locations = _.uniq(
        $(l).text() for l in @locationsDiv.find('span'))

      # Create an array of strings in the form 'location={location name}'
      # suitable for joining and stuffing into a search URL.
      # Each location in `locations` will have an 'x' that we need to slice off.
      return ("location=#{loc}" for loc in locations)

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
        @search(@lastSearch.locations, @lastSearch.type, @lastSearch.query)
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
      query = $('.query').val()
      type = $('.category').val()
      locations = @getSearchLocations()

      # On Chrome, the following code will allow the browser's form validation
      # engine to kick in if we don't have all required values for a search.
      # TODO: Cross-browser form field validation.
      if query and type and locations.length > 0
        # Differentiate between page load on a search URL and the user
        # initiating search, so we don't try to rebuild the location box.
        @searchClicked = true
        searchUrl = @buildSearchUrl(locations, type, query)
        @router.navigate(searchUrl)
        @toggleSearchDropdown()

    # Remove a location from the location div.
    removeLocation: () ->
      $(@).parent().remove()

      if @locationsDiv.children('span').length == 0
        @locationInput.css("top", 0)

    # When a Craigslist instance has results, display them on the page,
    # separated by headers for each location the user searched.
    displaySearchResults: =>
      prices = []
      rooms = []

      if not @lastSearch.result.items
        @retryLastSearch()
      else
        @retryCount = 0

      # TODO: Refactor other sections so we can call @clearItems() elsewhere.
      @clearItems()
      @hideLoadingIcon()
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

      if not @searchClicked
        # This event tells Chosen to clear the autocomplete widget. Otherwise
        # we may get a duplicate item in the location input.
        @locationInput.trigger('liszt:updated')
        for loc in locations
          @addSearchLocation(loc)


      $('.category').val(type)
      $('.query').val(query)

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
        # Display a separate list for each search type.
        for url, search of savedSearches
          type = $('#'+search.type).children('h2').text()
          id = "history-#{search.type}"
          ol = $('ol#' + id)

          if ol.length == 0
            $('<h3>').appendTo(historyItems).text(type)
            ol = $('<ol>').appendTo(historyItems).attr({id: id})

          li = $('<li>').appendTo(ol)
          locations = @getLocationNamesForUrls(search.locations)
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
        # TODO: Fix this
        #delete(item)

      @itemViews = []

    displayIndex: ->
      @displaySection('welcome')

    displaySection: (sectionId) ->
      listingDiv = $('#result-listing')
      listingDiv.removeClass('hidden')
      sectionDiv = $('#'+sectionId)
      sectionItems = sectionDiv.find('.items')

      # Clear section content (search results, etc.).
      # Ideally this would be a call to @clearItems(), but only search uses a
      # View class to render individual content items, so here we remove children
      # of div.items manually. TODO: Fix this.
      $('#result-listing').find('.items').empty()

      @clearSidebar()

      # Hide divs other than the chosen section div.
      $('#result-listing').children('div').not(sectionDiv).addClass('hidden')
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

  return {
    AppView: AppView
  }
)
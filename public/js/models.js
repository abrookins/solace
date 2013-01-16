// Generated by CoffeeScript 1.4.0
(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(['jquery', 'lib/underscore', 'lib/backbone'], function($, _, Backbone) {
    var Craigslist, CraigslistSearch, handleAjaxError;
    handleAjaxError = function(xhr, status, error) {
      return console.log(xhr, status, error);
    };
    CraigslistSearch = (function(_super) {

      __extends(CraigslistSearch, _super);

      function CraigslistSearch() {
        this.cacheResult = __bind(this.cacheResult, this);
        return CraigslistSearch.__super__.constructor.apply(this, arguments);
      }

      CraigslistSearch.prototype.initialize = function(options) {
        this.createdAt = null;
        this.result = options.result || {};
        this.url = options.url;
        this.query = options.query;
        this.type = options.type;
        this.params = options.params;
        this.locations = options.locations;
        this.cachedResult = options.cachedResult;
        this.searchCacheKey = options.searchCacheKey;
        return this.cacheTtl = 3600000;
      };

      CraigslistSearch.prototype.toJSON = function() {
        return {
          url: this.url,
          type: this.type,
          query: this.query,
          result: this.result,
          locations: this.locations,
          cacheTtl: this.cacheTtl,
          params: this.params
        };
      };

      CraigslistSearch.prototype.fromJSON = function(json) {
        var obj;
        obj = JSON.parse(json);
        return new CraigslistSearch({
          url: obj.url,
          query: obj.query,
          type: obj.type,
          result: obj.result,
          params: obj.params,
          locations: obj.locations,
          cacheTtl: obj.cacheTtl,
          cachedResult: true
        });
      };

      CraigslistSearch.prototype.run = function() {
        var _this = this;
        if (this.cachedResult) {
          return this.trigger('searchFinished');
        } else {
          return $.ajax({
            type: "GET",
            url: this.url,
            dataType: 'json',
            error: handleAjaxError,
            success: function(data) {
              if (data.result) {
                _this.result.items = data.result;
                _this.result.created = new Date().toUTCString();
                _this.cacheResult();
              }
              return _this.trigger('searchFinished');
            }
          });
        }
      };

      CraigslistSearch.prototype.getParams = function() {
        var params;
        params = [];
        _.each(this.params, function(param) {
          return params.push("" + param[0] + "=" + param[1]);
        });
        return params;
      };

      CraigslistSearch.prototype.getCreatedAtTime = function() {
        var result;
        result = this.get('result');
        if (result) {
          return Date.parse(result.created);
        }
      };

      CraigslistSearch.prototype.cacheResult = function() {
        if (!localStorage) {
          return;
        }
        try {
          return localStorage.setItem(this.searchCacheKey + this.url, JSON.stringify(this));
        } catch (e) {
          if (e.name === 'QUOTA_EXCEEDED_ERR') {
            console.log('Could not cache result: Out of space in localStorage.');
          }
        }
      };

      CraigslistSearch.prototype.parseSubdomain = function(url) {
        return url.split('.')[0].substr(7);
      };

      return CraigslistSearch;

    })(Backbone.Model);
    Craigslist = (function(_super) {

      __extends(Craigslist, _super);

      function Craigslist() {
        return Craigslist.__super__.constructor.apply(this, arguments);
      }

      Craigslist.prototype.initialize = function(options) {
        this.searchCacheKey = 'searchCache';
        return this.baseUrl = "/search";
      };

      Craigslist.prototype.buildQueryString = function(key, values) {
        var val;
        return ((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = values.length; _i < _len; _i++) {
            val = values[_i];
            _results.push("" + key + "=" + (encodeURIComponent(val)));
          }
          return _results;
        })()).join('&');
      };

      Craigslist.prototype.buildQueryUrl = function(locationNames, type, query, params) {
        var encodedQuery, locationQuery, typeQuery, url;
        locationQuery = this.buildQueryString('location', locationNames);
        typeQuery = this.buildQueryString('type', [type]);
        encodedQuery = encodeURIComponent(query.replace(/\s/g, '+'));
        url = "" + this.baseUrl + "?" + locationQuery + "&" + typeQuery + "&q=" + encodedQuery;
        if (params && params.length) {
          _.each(params, function(param) {
            return url += "&" + param[0] + "=" + param[1];
          });
        }
        return url;
      };

      Craigslist.prototype.search = function(options) {
        var result, url;
        url = this.buildQueryUrl(options.locations, options.type, options.query, options.params);
        result = this.getSearchFromCache(url);
        if (!result) {
          result = new CraigslistSearch({
            url: url,
            type: options.type,
            query: options.query,
            locations: options.locations,
            params: options.params,
            searchCacheKey: this.searchCacheKey
          });
        }
        return result;
      };

      Craigslist.prototype.getSearchFromCache = function(url) {
        var diff, json, search;
        if (!localStorage) {
          return;
        }
        json = localStorage.getItem(this.searchCacheKey + url);
        if (json) {
          search = new CraigslistSearch().fromJSON(json);
          diff = new Date().getTime() - search.getCreatedAtTime();
          if (diff <= search.cacheTtl) {
            return search;
          } else {
            return localStorage.removeItem(this.searchCacheKey + url);
          }
        }
      };

      Craigslist.prototype.clearSearchCache = function() {
        var key, val, _results;
        if (!localStorage) {
          return;
        }
        _results = [];
        for (key in localStorage) {
          val = localStorage[key];
          if (key.search(this.searchCacheKey) === 0) {
            _results.push(localStorage.removeItem(key));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };

      Craigslist.prototype.getCachedSearches = function() {
        var cachedSearches, key, val;
        if (!localStorage) {
          return;
        }
        cachedSearches = {};
        for (key in localStorage) {
          val = localStorage[key];
          if (key.search(this.searchCacheKey) === 0) {
            cachedSearches[key] = new CraigslistSearch().fromJSON(val);
          }
        }
        return cachedSearches;
      };

      return Craigslist;

    })(Backbone.Model);
    return {
      Craigslist: Craigslist
    };
  });

}).call(this);
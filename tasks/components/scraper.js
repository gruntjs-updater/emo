(function() {
    'use strict';

    var fs = require('fs');
    var path = require('path');
    var marked = require('marked');
    var regex = require('../utils/regexs');
    var Janitor = require('./Janitor');
    var fileExists = require('../utils/fileExists');
    var merge = require('../utils/merge');

    /**
     * @class Scraper
     * @param {Array} files
     * @constructor
     */
    var Scraper = function(files) {
        this.files = files;

        this.components = [];

        return this.init();
    };

    var proto = Scraper.prototype;

    /**
     * @method scraper.init
     */
    proto.init = function() {
        this.files.forEach(this.scrape.bind(this));

        return this;
    };

    /**
     * @method scraper.get
     */
    proto.get = function() {
        return this.components;
    };

    /**
     * @method scraper.scrape
     */
    proto.scrape = function(item) {
        var src = item.src[0];
        var options = { encoding: 'utf8' };
        var basepath = src.replace(path.basename(src), '');
        var extname = path.extname(src).replace(/./, '');
        var content = fs.readFileSync(src, options);
        var components = new Janitor(content.match(regex.docs));

        components.forEach(function(component) {
            this.add(component, options, basepath);
        }.bind(this));
    };

    /**
     * @method scraper.add
     */
    proto.add = function(component, options, basepath) {
        var keys;

        if (!this.isValid(component)) {
            return;
        }

        keys = Object.keys(component);

        keys.forEach(function(key) {
            if (key !== 'description') {
                return;
            }

            component[key] = component[key].match(regex.html_file)
                             ? fs.readFileSync(basepath + component[key], options)
                             : component[key].match(regex.markdown_file)
                             ? marked(fs.readFileSync(basepath + component[key], options))
                             : marked(component[key]);
        });

        if (this.exists(component)) {
            this.merge(component);

            return;
        }

        this.components.push(component);
    };

    /**
     * @method scraper.merge
     */
    proto.merge = function(component) {
        var name = component.name;

        this.components.some(function(target, i) {
            if (name !== target.name) {
                return false;
            }

            this.components[i] = merge(target, component);

            return true;
        }.bind(this));
    };

    /**
     * @method scraper.isValid
     */
    proto.isValid = function(component) {
        return component && component.category && component.name && component.description;
    };

    /**
     * @method scraper.exists
     */
    proto.exists = function(component) {
        var name = component.name;
        var exists = false;

        this.components.some(function(component) {
            exists = component.name === name;

            return exists;
        });

        return exists;
    };

    module.exports = Scraper;

} ());
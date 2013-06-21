/*
 * GET home page.
 */

var Deferred = require('jsdeferred').Deferred;
var jQuery = require('../lib/jquery/node-jquery.js');

var rdfstore = require('../lib/rdfquery/jquery.rdfquery.js');

var formidable = require('formidable'),
    util = require('util');

var fs = require('fs');

require('../config.settings'); // include settings

//var wikiTemplate;
//fs.readFile(__dirname + '/../views/wiki.html', function (err, template) {
//    if (err) {
//        throw err;
//    } else {
//        wikiTemplate = template.toString();
//    }
//});

var path = require('path');

//var encoder = require('../lib/encoderHTML');
var crypto = require('crypto');
var _ = require('underscore');

var winston = require('winston');
//winston.add(winston.transports.File, { filename: 'debug.log' });

var rdfstorejs = require('rdfstore')
    , jsonld = require('../lib/jsonld/jsonld.js')
    , RDFa = require('../lib/jsonld/rdfa.js')
    , jsdom = require('jsdom');

var mustache = require('mustache');

var request = require('request');


jsonld.use('request');

var store;
var schema_org_cache = require("../db/schema.org.json");

new rdfstorejs.Store({
    persistent: true,
    engine: 'mongodb',
    name: 'wikinext',
    overwrite: false,    // delete all the data already present in the MongoDB server
    mongoDomain: 'localhost', // location of the MongoDB instance, localhost by default
    mongoPort: 27017, // port where the MongoDB server is running, 27017 by default
    mongoDBOptions: {safe: false}
}, function (d) {
    store = d;
    store.rdf.setPrefix("schema", "http://schema.org/");
});

/**
 * Looking for a value in array
 * @param needle - value that we would like to find
 * @param haystack - array to check
 * @param argStrict - type of checking (=== or ==) - boolean
 * @returns {boolean}
 */
function in_array(needle, haystack, argStrict) {
    var key = '',
        strict = !!argStrict;

    if (strict) {
        for (key in haystack) {
            if (haystack[key] === needle) {
                return true;
            }
        }
    } else {
        for (key in haystack) {
            if (haystack[key] == needle) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Remove duplicates in array
 * @param arr   - array
 * @returns {Array} - new array without duplicates
 */
function eliminate_duplicates(arr) {
    var i,
        len = arr.length,
        out = [],
        obj = {};

    for (i = 0; i < len; i++) {
        obj[arr[i]] = 0;
    }
    for (i in obj) {
        out.push(i);
    }
    return out;
}

/**
 * Remove the same associated links and array
 * @param arr
 */
function eliminate_duplicates_predicate_value(arr) {
    var obj = {}, array = [], hash;

    for (var key in arr) {
        hash = crypto.createHash('md5').update(arr[key].predicate+"_"+arr[key].object).digest("hex")
        if (typeof obj[hash] === 'undefined') {
            obj[hash] = 0;
            array.push(arr[key]);
        }
    }
    return array;
}

function clone(obj) {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

function getLabelOfPropertySchemaOrg(obj){
    return schema_org_cache['properties'][obj.slice(18, obj.length)]['label'];
}

function getLabelOfOntologySchemaOrg(obj){
    return schema_org_cache['types'][obj.slice(18, obj.length)]['label'];
}

function getSchemaType(type){
    var response = clone(schema_org_cache['types'][type]);
    for (var prop in response['properties']) {
        var property = response['properties'][prop];
        console.log(property);
        var value = clone(schema_org_cache['properties'][property]);
        console.log(value);
        response['properties'][prop] = value;
    }
    return response;
}

module.exports = function (dao) {
    return {
        index: function (req, res) {
            var userid = "";
            var run = {
                main_pages: dao.pages.findMain(),
                recent: dao.pages.findByParamsAndSort({},{title:1,last_modified_at:1,last_modified_by:1, contributor: 1},{last_modified_at: -1})
            };
            if (req.session.auth) {
                userid = req.session.auth.userId;
                run['user_pages'] = dao.pages.findAllByUserId(userid);
            }
            Deferred.parallel(run)
                .next(function (data) {
                    for (var key in data['recent']) {
                        data['recent'][key]['last_modified_at_m'] = new Date(data['recent'][key]['last_modified_at']).toDateString();
                    }
                    //console.log(data['recent']);
                    res.render('index.html', {
                        locals: {
                            title: 'WikiNEXT V2',
                            auth: req.session.auth,
                            login: req.session.auth ? false : true,
                            pages: data['main_pages'],
                            user_pages: data['user_pages'],
                            recent: data['recent']
                        }});
                });

        },
        wiki: function (req, res) {
            //console.log("Page ID: " + req.params.id);
            var run = {
                page: dao.pages.findById(req.params.id),
                pages: dao.pages.findByParent(req.params.id),
                libraries: dao.jslibraries.findAll()
            };
            var page, pages, libraries;
            Deferred.parallel(run).next(function (data) {
                page = data['page'];
                pages = data['pages'];
                page['nav'] = [];
                libraries = data['libraries'];
            }).
                next(function (parentid) {
                    function createNav(parentid) {
                        //console.log('nav');
                        return dao.pages.findByIdLimited(parentid, {title: 1, parent: 1}).next(function (parent_page) {
                            //console.log('add nav');
                            page['nav'].unshift({
                                _id: parent_page._id.toString(),
                                title: parent_page.title
                            });
                            if (!_.isUndefined(parent_page['parent'])) {
                                return Deferred.call(createNav, parent_page['parent']['oid'].toString());
                            }
                        });
                    }

                    //console.log('if parent');
                    if (!_.isUndefined(page.parent)) {
                        //console.log('parent');
                        return Deferred.call(createNav, page.parent.oid.toString());
                    }
                }).
                next(function () {

                    if (typeof page['created_at'] != 'undefined')
                        page['created_at_m'] = new Date(page['created_at']).toDateString();
                    if (typeof page['last_modified_at'] != 'undefined')
                        page['last_modified_at_m'] = new Date(page['last_modified_at']).toDateString();

                    // plugged libraries
                    page['js'] = [];
                    if (_.isArray(page['libraries'])) {
                        _.each(libraries, function (value, key) {
                            if (in_array(value._id.toString(), page['libraries'])) {
                                page['js'].push({src: value.name});
                            }
                        });
                    }

                    //console.log(page);

                    res.render('wiki.html', {
                        locals: {
                            page_id: page._id,
                            title: 'WikiNEXT V2 : ' + page['title'],
                            auth: req.session.auth,
                            login: req.session.auth ? false : true,
                            page: page,
                            pages: pages,
                            libraries: libraries
                        }});
                });
        },
        user: function (req, res) {
            //console.log("User ID: " + req.params.id);
            var run = {
                page: dao.users.findById(req.params.id),
                pages: dao.pages.findAllByUserId(req.params.id)
            };
            var page, pages;
            Deferred.parallel(run).next(function (data) {
                page = data['page'],
                pages = data['pages']
            }).next(function () {
                    //console.log(page);
                    res.render('user.html', {
                        locals: {
                            page_id: page._id,
                            title: 'WikiNEXT V2 : ' + page['name'],
                            auth: req.session.auth,
                            login: req.session.auth ? false : true,
                            page: page,
                            pages: pages
                        }});
                });
        },
        create: function (req, res) {
            if (req.session.auth) {
                var data = {};
                console.log(req.session.auth);
                data.userid = req.session.auth.userId;
                winston.info('Session', req.session.auth);
                if (typeof req.body['page_name'] !== "undefined")
                    data['title'] = req.body.page_name;
                else
                    data.title = "new page";
                if (!_.isUndefined(req.body.parent))
                    data.parent = req.body.parent;
                dao.users.findById(data.userid).next(function (result) {
                    data.created_by = result.name;
                    dao.pages.insert(data, function (error, result) {
                        if (error != undefined)
                            console.log("Got an error: " + error);
                        //console.log(result[0]._id);
                        res.send({pageid: result[0]._id});
                        //res.redirect("/wiki/" + result[0]._id + "/edit");

                    });
                });
            } else {
                res.redirect("/");
            }
        },
        find: function(req,res){
            var title = req.body.title;
            dao.pages.findByParams({title:title},{'title':1}).next(function(result){
                res.send(result);
            });
        },
        /**
         * Edit page view
         * @param req
         * @param res
         */
        edit: function (req, res) {
            if (req.session.auth) {
                var data = {};
                data.userid = req.session.auth.userId;
                dao.users.findById(data.userid).next(function (result) {
//                    data.last_modified_by = {
//                        name: result.name
//                    };
                    var run = {
                        page: dao.pages.findById(req.params.id),
                        libraries: dao.jslibraries.findAll()
                    };
                    Deferred.parallel(run).next(function (d) {
                        //winston.info(d['libraries']);
                        //winston.info(d['page']);
                        _.each(d['libraries'], function (value, key) {
                            if (in_array(value._id.toString(), d['page']['libraries'])) {
                                d['libraries'][key].plugged = "unplug";
                            }
                            else {
                                d['libraries'][key].plugged = "plug";
                            }
                        });

                        res.render('edit.html', {
                            locals: {
                                title: 'WikiNEXT V2',
                                auth: req.session.auth,
                                login: req.session.auth ? false : true,
                                page: d['page'],
                                page_id: d['page']['_id'],
                                libraries: d['libraries']
                            }});
                    });
                });
            } else {
                res.redirect("/");
            }
        },
        upload: function (req, res) {
            if (req.session.auth) {
                //var data = {};
                //data.userid = req.session.auth.userId;
                //console.log(data.userid);
                //dao.users.findById(data.userid, function (error, result) {
//                    if (error != null)
//                        console.log(error);
//                    var username = result.name;
                if (req.xhr) {
                    var fName = req.header('x-file-name');
                    var fSize = req.header('x-file-size');
                    var fType = req.header('x-file-type');
                    var pageid = req.header('x-page-id');
                    var path_upload = __dirname + '/../public/upload/';
                    if (!fs.existsSync(path_upload + pageid)) {
                        winston.info("mkdir: " + path_upload + pageid);
                        fs.mkdirSync(path_upload + pageid);
                    }

                    var ws = fs.createWriteStream(path_upload + pageid + '/' + fName);

                    req.on('data', function (data) {
                        winston.info('data arrived');
                        ws.write(data);
                    });
                    req.on('end', function () {
                        winston.info("finished");
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true
                        }));
                        dao.pages.attachFile(pageid, {"index": crypto.createHash('md5').update(fName).digest("hex"), "path": 'upload/' + pageid, "type": fType, "name": fName, "uploaded_at": new Date()}, function (data) {
                            if (data != null)
                                winston.info(data);
                            else
                                winston.info("information to db was successfully added")
                        });
                    });
                }
                //});
            }
        },
        /**
         * Save new version of a page
         * @param req
         * @param res
         */
        save: function (req, res) {
            if (req.session.auth) {
                var data = {};
                data.userid = req.session.auth.userId;
                dao.users.findById(data.userid).next(function (result) {
                    data['_id'] = req.params.id;
                    if (typeof req.body['article'] !== "undefined")
                        data['article'] = req.body.article;
                    if (typeof req.body['app'] !== "undefined")
                        data['app'] = req.body.app;
                    if (typeof req.body['title'] !== "undefined")
                        data['title'] = req.body.title;
                    if (typeof req.body['jsl_id'] !== "undefined")
                        data['jsl_id'] = req.body.jsl_id;
                    data['last_modified_by'] = result.name;
                    data['last_modified_at'] = new Date();

                    // meta rdfquery
//                    var html_jquery = rdfstore.$(data['article']);
//                    var meta = []; //rdfstore.$(html).rdf().databank.dump();
                    //data['meta'] = JSON.stringify(meta);
                    var url = config.host_uri + '/wiki/' + data['_id'];
//                    var uri = '<' + url + '>';
//                    meta.push({s: uri, p: '<http://purl.org/dc/elements/1.1/contributor>', o: result.name});
//                    meta.push({s: uri, p: '<http://purl.org/dc/elements/1.1/title>', o: data['title']});
//                    rdfstore.$(html_jquery).rdf().where('?s ?p ?o').each(function (index, value) {
//                        //console.log("s: " + value.s.value + " p:" + value.p.value + " o:" + value.o.value);
//                        var s = _.isObject(value.s.value) ? '<' + value.s.value._string + '>' : value.s.value;
//                        var p = _.isObject(value.p.value) ? '<' + value.p.value._string + '>' : value.p.value;
//                        var o = _.isObject(value.o.value) ? '<' + value.o.value._string + '>' : value.o.value;
//                        meta.push({s: s, p: p, o: o});
//                    });
                    //console.log(meta);
//                    data['meta'] = meta;

                    dao.pages.update(data, function (error, result) {
                        if (error != undefined)
                            console.log("Got an error: " + error);
                        var version = {
                            article: result.article,
                            app: result.app,
                            title: result.title,
                            version: result.version,
                            saved_by: data['last_modified_by'],
                            saved_at: new Date()
                        };
                        dao.pageversions.insert(req.params.id, data.userid, version, function (error, result) {
                            res.send({status: "ok"});
                        });


                        request({
                            uri: config.host_uri + '/wiki/' + req.params.id
                        }, function (err, res, body) {
                            var html = body;

                            // DOM
                            store.clear(url, function (success) {
                                jsdom.env(html, function (errors, window) {
                                    if (errors && errors.length > 0) {
                                        console.log(errors);
                                    }
                                    window.location.href = url;
                                    // extract JSON-LD from RDFa
                                    RDFa.attach(window.document);
                                    //console.log(window.document.data);
                                    // create JSON-LD from RDF
                                    jsonld.fromRDF(window.document.data,
                                        {format: 'rdfa-api'}, function (error, data) {
                                            //console.log(error);
                                            console.log(data);

                                            store.load("application/ld+json", data, url, function (success, results) {
                                                //console.log(results);
                                            });
                                        });
                                });
                            });
                        });

                    });

                });
            }
        },
        /**
         * Create a page's clone
         * @param req
         * @param res
         */
        clone: function (req, res) {
            if (req.session.auth) {
                var run = {
                    page: dao.pages.findById(req.params.id)
                };
                Deferred.parallel(run).next(function (arr) {
                    var data_orig = arr['page'];
                    var data = {};
                    data.userid = req.session.auth.userId;
                    dao.users.findById(data.userid).next(function (result) {
                        if (typeof data_orig['article'] !== "undefined")
                            data['article'] = data_orig.article;
                        if (typeof data_orig['app'] !== "undefined")
                            data['app'] = data_orig.app;
                        data['title'] = "Cloned";
                        if (typeof data_orig['title'] !== "undefined")
                            data['title'] = data['title']+": "+data_orig.title;
                        if (typeof data_orig['libraries'] !== "undefined")
                            data['libraries'] = data_orig.libraries;
                        data['last_modified_by'] = result.name;
                        data['last_modified_at'] = new Date();
                        data['created_by'] = result.name;
                        data['created_ay'] = new Date();
                        data['cloned_from'] = data_orig._id;

                        dao.pages.insert(data, function (error, result) {
                            if (error != undefined)
                                console.log("Got an error: " + error);
                            res.redirect("/wiki/" + result[0]._id + "/edit");
                        });

                    });
                });
            }
        },
        deleteattach: function (req, res) {
            var index = req.body.index;
            var pageid = req.body.pageid;
            dao.pages.findById(pageid).next(function (page) {
//                if (page.attach instanceof Array) {

                //console.log("page was found");
                var i = 0;
                while (page.attach[i].index != index) {
                    i++;
                }
                var path_upload = __dirname + '/../public/upload/';
                if (fs.existsSync(path_upload + pageid)) {
                    //console.log("directory exists");
                    var filepath = path_upload + pageid + '/' + page.attach[i].name;
                    if (fs.existsSync(filepath)) {
                        //console.log("delete "+filepath);
                        fs.unlinkSync(filepath);
                    }
                }

                dao.pages.deattachFile(pageid, index, function (data) {
                    if (data != null) {
                        //console.log(data);
                        res.send({status: "ko", error: data});
                    }
                    else {
                        //console.log("information in db was successfully updated")

                    }
                });
//                }
            });
        },
        /**
         * Attach JS library to the page
         * @param req
         * @param res
         */
        attach_library: function (req, res) {
            // received from page
            var pageid = req.body.pageid;
            var libraryid = req.body.libraryid;

            // need to find all information in our database
            var find_information = {
                page: dao.pages.findById(pageid),
                library: dao.jslibraries.findById(libraryid)
            };

            // run queries
            Deferred.parallel(find_information).next(function (data) {
                //console.log(data['page']);
                //console.log(data['library']);
                // do we have already this library attached to the page?
                if (_.isArray(data['page']['libraries'])) {
                    if (!in_array(libraryid, data['page']['libraries'])) {
                        dao.pages.plugJSLibrary(pageid, libraryid).next(function () {
                            res.send({status: "ok"});
                        }).error(function (error) {
                                res.send({status: "ko", error: error})
                            });
                    }
                    else {
                        dao.pages.unplugJSLibrary(pageid, libraryid).next(function () {
                            res.send({status: "ok"});
                        }).error(function (error) {
                                res.send({status: "ko", error: error});
                            });
                    }
                }
                else {
                    dao.pages.plugJSLibrary(pageid, libraryid).next(function () {
                        res.send({status: "ok"});
                    }).error(function (error) {
                            res.send({status: "ko", error: error})
                        });
                }

            });

        },
        /**
         * Update page's cache
         * @param req
         * @param res
         */
        update_cache: function (req, res) {
            // id of the page
            var pageid = req.body.pageid;
            // query name
            var name = req.body.name;
            // query result
            var result = req.body.result;
            dao.pages.findById(pageid).next(function (page) {
                if (!_.isObject(page.cache))
                    page.cache = {};
                result.cache_updated = new Date();
                page.cache[name] = result;
                //console.log(page.cache);
                dao.pages.updateCache(pageid, page.cache).next(function () {
                    res.send({status: "ok"});
                }).error(function (error) {
                        res.send({status: "ko", error: error});
                    });
            });
        },
        /**
         * Load page's cache
         * @param req
         * @param res
         */
        load_cache: function (req, res) {
            // id of the page
            var pageid = req.body.pageid;
            // looking for a page
            dao.pages.findById(pageid, {cache: 1}).next(function (page) {
                if (!_.isObject(page.cache))
                    page.cache = {};
                // sending cache to a client
                res.send({cache: page.cache});
            });
        },
        /**
         * Load page's meta
         * @param req
         * @param res
         */
        load_meta: function (req, res) {
            // id of the page
            var pageid = req.body.pageid;
            // looking for a page
            dao.pages.findById(pageid, {meta: 1}).next(function (page) {
                if (!_.isObject(page.meta))
                    page.meta = {};
                // sending cache to a client
                res.send({meta: page.meta});
            });
        },
        /**
         * Load article which we want to use such as template
         * @param req
         * @param res
         */
        load_template: function (req, res) {
            // id of the page
            var pageid = req.body.pageid;
            // looking for a page
            dao.pages.findById(pageid, {article: 1}).next(function (page) {
                console.log(page);
                if (_.isUndefined(page.article))
                    page.article = {};
                // sending template to a client
                res.send(page.article);
            });
        },
        /**
         * Delete page
         * @param req
         * @param res
         */
        remove: function (req, res) {
            // id of the page
            var pageid = req.params.id;
            if (req.session.auth) {
                // current user
                var userid = req.session.auth.userId;

                dao.pages.findById(pageid).next(function (page) {
                    // only owner of a page can delete it
                    if (page.userid == userid) {
                        dao.pages.remove(pageid, function (msg) {
                            var url = config.host_uri + '/wiki/' + pageid;
                            store.clear(url, function (success) {
                                //console.log(msg);
                                res.send({status: "ok"});
                            });
                            //res.redirect("/home");
                        });
                    }
                });
            }
        },
        /**
         * Update parent page of precised page
         * @param req
         * @param res
         */
        updateParent: function (req, res) {
            // id of the page
            var pageid = req.body.pageid;
            // id of the parent page
            var parentid = req.body.parentid;
            if (req.session.auth && pageid != parentid) {
                dao.pages.updateParent(pageid, parentid).next(function (page) {
                    //res.redirect("/wiki/" + pageid);
                    res.send({status: "ok"});
                }).error(function (error) {
                        console.log(error);
                    });
            }

        },

        loadPagesTree: function (req, res) {
            dao.pages.findAllLinks().next(function (pages) {
                res.send({status: "ok", pages: pages});
            });
        },
        /**
         * Looking for a data in our meta base that has a value
         * @param req
         * @param res
         */
        search_meta: function (req, res) {
            // 1) load all meta
            // 2) rdfstore from dump
            // 3) request
            var value = req.body.value === undefined ? "Don Tapscott" : req.body.value;

//            var bank = rdfstore.$.rdf()
//                .base(config.host_uri)
//                .prefix('dc', 'http://purl.org/dc/elements/1.1/')
//                .prefix('foaf', 'http://xmlns.com/foaf/0.1/');
//            dao.pages.findAllWithParameters({meta : 1}).next(function(pages){
//                _.each(pages, function (page) {
//                    //console.log(page);
//                    if (_.isArray(page.meta)) {
//                        //console.log(page.meta);
//                        _.each(page.meta, function(value) {
//                            //console.log(value);
//                            var s = value.s[0] === '<' ? value.s : '"'+value.s+'"';
//                            var p = value.p[0] === '<' ? value.p : '"'+value.p+'"';
//                            var o = value.o[0] === '<' ? value.o : '"'+value.o+'"';
//                            var triple = s+' '+p+' '+o+' .';
//                            //console.log(triple);
//                            bank.add(triple);
//                        });
//                    }
//                });
//                //console.log(bank);
////                bank.where('?s ?p ?o').each(function(index,value){
////                    console.log("s: " + value.s.value + " p:" + value.p.value + " o:" + value.o.value);
////                });
//
//                var predict = [];
//                bank.where('?x ?predict ?name').filter('name',value).each(function(index, value){
//                    predict.push(value.x.value._string);
//                });
//                //console.log(predict);
//                var result = [];
//                _.each(predict,function(value){
//                    var result_part = [];
//                    bank.about('<'+value+'>').each(function(value,k) {
//                        //console.log(k.property + " = " +  k.value.value);
//                        result_part.push({p: k.property, v: k.value.value});
//                    });
//                    result.push({p:value,r:result_part});
//                });
//                res.send(result);
//            });
            var query = {"predicate": "u:@value", object: "l:\"" + value + "\""};
            var fields = {"subject": 1, "graph": 1};
            dao.quads.findByParams(query, fields).next(function (results) {
                console.log(results);
                // schema -> [ usages ]
                var data = {};
//                var usage_keys = [];
                Deferred.loop(results.length,function (iterator_results) {
                    var ref = results[iterator_results];
                    query = {"object": ref.subject};
                    fields = {"subject": 1, "predicate": 1, "graph": 1, "_id": 0};
                    return dao.quads.findByParams(query, fields).next(function (usages) {
                        console.log(usages);
                        return Deferred.loop(usages.length, function (iterator_usage) {
                            var usage = usages[iterator_usage];
//                            if (!in_array(usage.subject+usage.predicate, usage_keys)) {
//
//                                usage_keys.push(usage.subject+usage.predicate);
                            var filtered_uri = usage.subject.substr(0,2) == 'u:' ? usage.subject.substr(2,usage.subject.length) : usage.subject;
                            var filtered_graph = usage.graph.substr(0,2) == 'u:' ? usage.graph.substr(2,usage.graph.length) : usage.graph;

                            query = {"subject": usage.subject, "predicate": "u:http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "graph": usage.graph};
                            if (typeof data[filtered_uri] === "undefined")
                                data[filtered_uri] = {};
                            fields = {"_id": 0, "object": 1 };
                            return dao.quads.findByParams(query, fields).next(function (schemas) {
                                //console.log(schemas);
                                if (schemas.length > 0)
                                    return Deferred.loop(schemas.length, function (iterator_schema) {
                                        var schema = schemas[iterator_schema];
                                        //console.log(usage);
                                        // TODO need to find where the definition of predicate/property... in which ontology,
                                        // in case we have more than 1, we will have the same predicate few times...
                                        // ? if we didn't find any ontology which has it definition, we need to add our predicate in "not defined"?
                                        // Subject : <http://www.w3.org/2000/01/rdf-schema#subClassOf> : Object
                                        // Subject == schema.subject
                                        // Construct tree of found schemas?
                                        // Property
                                        // || Subject : <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> : <http://www.w3.org/1999/02/22-rdf-syntax-ns#Property>
                                        // Next query could give us an answer about where the definition of our property...
                                        // Subject : <http://schema.org/domain> : Object
                                        // Subject : <http://www.w3.org/2000/01/rdf-schema#label> : Object
                                        // If we know subject (our property is usage.predicate) we could find objects - where the definition and label
                                        // Domain(Object) need to be equal usage.object...
                                        var need_to_insert = false;
                                        // 18 = length(http://schema.org/) + 2 (u:);
                                        var property = schema_org_cache['properties'][usage.predicate.slice(20, usage.predicate.length)];
                                        var ontology = schema.object.slice(20, schema.object.length);
                                        var type = schema_org_cache['types'][ontology];
                                        //console.log(property);
                                        //console.log(ontology);
                                        //console.log(type);
                                        // looking for our ontology in domains, if it there - good
                                        for (var key in property['domains']) {
                                            if (property['domains'][key] == ontology) {
                                                need_to_insert = true;
                                            }
                                        }

                                        if (!need_to_insert) {
                                            for (key in type['ancestors'])
                                                if (in_array(type['ancestors'][key], property['domains']))
                                                    need_to_insert = true;
                                        }
                                        if (need_to_insert) {
//                                            if (typeof data[usage.subject][schema.object] === 'undefined')
//                                                data[usage.subject][schema.object] = {};
//                                            if (typeof data[usage.subject][schema.object][usage.predicate] === 'undefined')
//                                                data[usage.subject][schema.object][usage.predicate] = { "graphs": [usage.graph] };
//                                            else
//                                                data[usage.subject][schema.object][usage.predicate]["graphs"].push(usage.graph);
                                            if (typeof data[filtered_uri][type['label']] === 'undefined')
                                                data[filtered_uri][type['label']] = {};
                                            if (typeof data[filtered_uri][type['label']][property['label']] === 'undefined')
                                                data[filtered_uri][type['label']][property['label']] = { "graphs": [filtered_graph] };
                                            else
                                                data[filtered_uri][type['label']][property['label']]["graphs"].push(filtered_graph);
                                        }
                                    });
                                else {
                                    data[filtered_uri]["Unknown schema"] = {};
                                    data[filtered_uri]["Unknown schema"][usage.predicate] = { "graphs": [filtered_graph] };
                                    return Deferred.next();
                                }
                            });
                        });
                    });

                }).next(function () {
                        //console.log("here");
                        console.log(data);
                        res.send(data);
                    }).error(function(error) {
                        res.send({"error":error});
                    });
            });
        },
        endpoint: function (req, res) {
            var query = req.body.query;
            //console.log(query); //'http://127.0.0.1:8000/wiki/517a48e2cc1d5a4d81000001'
            dao.quads.distinct("graph", {}).next(function (results) {
                var graphs = [];
                _.each(results, function (value) {
                    graphs.push(value.slice(2, value.length));
                });
//                store.executeWithEnvironment("SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o } } ", [], graphs, function (success, results) {
//                    console.log(success);
//                    if (success) {
//                        // process results
//                        console.log(results);
//                    }
//                });
//                query = 'PREFIX schema: <http://schema.org/>'+
//                    'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>'+
//                    'SELECT * WHERE {'+
//                    '  ?s schema:name "Pavel Arapov". '+
//                    '  ?s rdf:type schema:Person. '+
//                    '  ?s schema:name ?t. '+
//                    '}';
//                query =
////                    'PREFIX schema:<http://schema.org/> '+
////                    ' PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> '+
//                    ' SELECT ?s ?p ?t ' +
//                    ' WHERE { '+
////                    '  ?s schema:name ?t. '+
//                    '  ?s ?p ?t '+
//                    ' } ';
//                //query = "SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o } } ";
//                query = "PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
//                    "PREFIX schema: <http://schema.org/>" +
//                    "SELECT ?g ?s ?p ?v WHERE { GRAPH ?g " +
//                    "{ " +
//                    "?s rdf:type schema:Article. " +
//                    "?s schema:name [ ?p ?v ] " +
//                    "} }";
                store.executeWithEnvironment(query, [], graphs, function (success, results) {
                    console.log(success);
                    console.log(results);
                    res.send(results);
//                var varNames = {};
//                var genBindings = [];
//                for(var i=0; i<results.length; i++) {
//                    var result = results[i];
//                    for(var p in results[i]) {
//                        varNames[p] = true;
//                    }
//                }
//                var head = {'variables':[]};
//                for(var p in varNames) {
//                    head['variables'].push({'name':p});
//                }
//                res.send(JSON.stringify({'head':head,'results':results}));

                    //console.log(graphToJSONLD(results,store.rdf));
                });
            });
//            query = 'PREFIX schema:<http://schema.org/> '+
//                'PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> '+
//                'SELECT ?s WHERE {'+
//                '  ?s schema:name "Pavel Arapov". '+
//                '  ?s rdf:type schema:Person. '+
//                '}';
//            store.execute(query, function(success, results){
//                console.log(success);
////                if(success) {
//                    // process results
//                    console.log(results);
//                    res.send(results);
////                }
//            });

        },
        uri: function (req, res) {
            var uri = req.body.uri;
            var query = {"subject": "u:" + uri};
            var fields = {"_id": 0, "predicate": 1, "object": 1};
            dao.quads.findByParams(query, fields).next(function (results) {
                var blanknodes = [];
                for (var key in results) {
                    if (results[key].object.substr(0,2) == 'b:' ) {
                        blanknodes.push(results[key].object);
                        //console.log("blank node: "+results[key].object);
                    }
                }

                query = {"subject":{$in: blanknodes},"predicate":"u:@value"};
                fields = {"_id": 0, "subject": 1, "object": 1};
                dao.quads.findByParams(query, fields).next(function (values) {
                    //console.log(values);
                    for (key in values) {
                        //results[key].predicate = results[key].predicate.substr(2, results[key].predicate.length);
                        for (var i in results) {
                            if (results[i].object == values[key].subject) {
                                results[i].object = values[key].object.substr(3, values[key].object.length - 4);
                            }
                        }
                    }
                    for (key in results) {
                        if (results[key].object.substr(0, 2) == 'u:') {
                            results[key].object = results[key].object.substr(2, results[key].object.length);
                            if (results[key].object.substr(0,18) == 'http://schema.org/' && results[key].object.length != 18)
                                results[key].object = getLabelOfOntologySchemaOrg(results[key].object);
                        }
                        if (results[key].predicate.substr(0, 2) == 'u:') {
                            results[key].predicate = results[key].predicate.substr(2, results[key].predicate.length);
                            if (results[key].predicate.substr(0,18) == 'http://schema.org/')
                                results[key].predicate = getLabelOfPropertySchemaOrg(results[key].predicate);
                        }
                        if (results[key].predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
                            results[key].predicate = "Class (RDF Type)";
                    }
                    results = eliminate_duplicates_predicate_value(results);
                    //console.log(results);
                    res.send(results);
                });
            });
        },
        schema: function (req, res) {
            var action = req.body.action;
            var response = {};
            switch (action){
                case 'types':
                    break;
                case 'type':
                    response = getSchemaType(req.body.type);
                    break;
                case 'properties':
                    break;
                case 'datatypes':
                    response = schema_org_cache['datatypes'];
                    break;
                case 'property':
                    break;
            }
            res.send(response);
        }
    };
};
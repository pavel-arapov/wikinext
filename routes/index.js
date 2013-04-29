/*
 * GET home page.
 */

var Deferred = require('jsdeferred').Deferred;
var jQuery = require('../lib/jquery/node-jquery.js');

var rdfstore = require('../lib/rdfquery/jquery.rdfquery.js');

var formidable = require('formidable'),
    util = require('util');

var fs = require('fs');

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


jsonld.use('request');

var store;

new rdfstorejs.Store({
    persistent: true,
    engine: 'mongodb',
    name: 'rdfstore',
    overwrite: false,    // delete all the data already present in the MongoDB server
    mongoDomain: 'localhost', // location of the MongoDB instance, localhost by default
    mongoPort: 27017, // port where the MongoDB server is running, 27017 by default
    mongoDBOptions: {safe: false}
}, function (d) {
    store = d;
});


/**
 * Transforms a RDF JS Interfaces API Graph object into a JSON-LD serialization
 *
 * @arguments
 * @param graph JS RDF Interface graph object to be serialized
 * @param rdf JS RDF Interface RDF environment object
 */
graphToJSONLD = function(graph, rdf) {
    var nodes = {};

    graph.forEach(function(triple) {
        var subject = triple.subject.valueOf();
        var node = nodes[subject];
        if(node == null) {
            node = {"@subject" : subject, "@context": {}};
            nodes[subject] = node;
        }

        var predicate = triple.predicate.valueOf();
        if(predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
            predicate = "@type";
        }

        var property  = null;
        var isCURIE = false;
        property = rdf.prefixes.shrink(predicate);

        if(property != predicate) {
            isCURIE = true;
        }
        if(property.indexOf("#") != -1) {
            property = property.split("#")[1];
        } else {
            property = property.split("/");
            property = property[property.length-1];
        }

        var object = triple.object.valueOf();

        if(node[property] != null) {
            if(!isCURIE) {
                if(node["@context"][property] != null || property[0] === '@') {
                    if(typeof(node[property]) === "object") {
                        node[property].push(object);
                    } else {
                        object = [ node[property], object];
                        node[property] = object;
                    }
                } else {
                    property = triple.predicate.valueOf();
                    if(node[property] == null) {
                        node[property] = object;
                    } else {
                        if(typeof(node[property]) === "object") {
                            node[property].push(object);
                        } else {
                            object = [ node[property], object ];
                            node[property] = object;
                        }
                    }

                    if(typeof(object) === 'string' &&
                        (object.indexOf("http://") == 0 || object.indexOf("https://") == 0)) {
                        jsonldCoerce(node, property, "@iri");
                    }
                }
            } else {
                var prefix = property.split(":")[0];
                if(typeof(node[property]) === "object") {
                    node[property].push(object);
                } else {
                    object = [ node[property], object];
                    node[property] = object;
                }
            }
        } else {
            node[property] = object;
            if(property[0] != '@') {
                if(isCURIE == true) {
                    // saving prefix
                    var prefix = property.split(":")[0];
                    node["@context"][prefix] = rdf.prefixes[prefix];
                } else {
                    // saving whole URI in context
                    node["@context"][property] = triple.predicate.valueOf();
                }

                if(typeof(object) === 'string' &&
                    (object.indexOf("http://") == 0 || object.indexOf("https://") == 0)) {
                    jsonldCoerce(node, property, "@iri");
                }

            }
        }
    });

    var results = [];
    for(var p in nodes) {
        results.push(nodes[p]);
    }

    return results;
};

/**
 * Adds a coercion annotation to a json-ld object
 *
 * @arguments
 * @param obj jsonld Object where the coerced property will be added
 * @param prpoerty URI of the property to be coerced
 * @param type coercion type
 */
jsonldCoerce = function(obj, property, type) {
    if(obj['@context'] == null) {
        obj['@context'] = {};
    }
    if(obj['@context']['@coerce'] == null) {
        obj['@context']['@coerce'] = {};
        obj['@context']['@coerce'][type] = property;
    } else if(typeof(obj['@context']['@coerce'][type]) === 'string' &&
        obj['@context']['@coerce'][type] != property) {
        var oldValue = obj['@context']['@coerce'][type];
        obj['@context']['@coerce'][type] = [oldValue, property];
    } else if(typeof(obj['@context']['@coerce'][type]) === 'object') {
        for(var i=0; i<obj['@context']['@coerce'][type].length; i++) {
            if(obj['@context']['@coerce'][type][i] === property)  {
                return obj;
            }
        }

        obj['@context']['@coerce'][type].push(property);
    } else {
        obj['@context']['@coerce'][type] = property;
    }

    return obj;
};

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


module.exports = function (dao) {
    return {
        index: function (req, res) {
            var userid = "";
            var run = {
                main_pages: dao.pages.findMain()
            };
            if (req.session.auth) {
                userid = req.session.auth.userId;
                run['user_pages'] = dao.pages.findAllByUserId(userid);
            }
            Deferred.parallel(run)
                .next(function (data) {
                    res.render('index.html', {
                        locals: {
                            title: 'WikiNEXT V2',
                            auth: req.session.auth,
                            login: req.session.auth ? false : true,
                            pages: data['main_pages'],
                            user_pages: data['user_pages']
                        }});
                });

        },
        wiki: function (req, res) {
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
                        page['created_at'] = new Date(page['created_at']).toDateString();
                    if (typeof page['last_modified_at'] != 'undefined')
                        page['last_modified_at'] = new Date(page['last_modified_at']).toDateString();

                    // plugged libraries
                    page['js'] = [];
                    if (_.isArray(page['libraries'])) {
                        _.each(libraries, function (value, key) {
                            if (in_array(value._id.toString(), page['libraries'])) {
                                page['js'].push({src: value.name});
                            }
                        });
                    }

                    console.log(page);

                    res.render('wiki.html', {
                        locals: {
                            page_id: page._id,
                            title: 'WikiNEXT V2',
                            auth: req.session.auth,
                            login: req.session.auth ? false : true,
                            page: page,
                            pages: pages,
                            libraries: libraries
                        }});
                });
        },
        create: function (req, res) {
            if (req.session.auth) {
                var data = {};
                data.userid = req.session.auth.userId;
                winston.info('Session', req.session.auth);
                if (typeof req.body['page_name'] !== "undefined")
                    data['title'] = req.body.page_name;
                else
                    data.title = "new page";
                if (!_.isUndefined(req.body.parent))
                    data.parent = req.body.parent;
                dao.users.findById(data.userid, function (error, result) {
                    data.created_by = result.name;
                    dao.pages.insert(data, function (error, result) {
                        if (error != undefined)
                            console.log("Got an error: " + error);
                        res.redirect("/wiki/" + result[0]._id + "/edit");

                    });
                });
            } else {
                res.redirect("/");
            }
        },
        /**
         * Edit page view
         * @param req
         * @param res
         */
        edit: function (req, res) {
            //console.log("edit");
            if (req.session.auth) {
                var data = {};
                data.userid = req.session.auth.userId;
                dao.users.findById(data.userid, function (error, result) {
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
                dao.users.findById(data.userid, function (error, result) {
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
                    var html = rdfstore.$(data['article']);
                    // meta rdfquery
                    var meta = []; //rdfstore.$(html).rdf().databank.dump();
                    //data['meta'] = JSON.stringify(meta);
                    var url = 'http://wikinext.gexsoft.com/wiki/'+data['_id'];
                    var uri = '<'+url+'>';
                    meta.push({s: uri, p: '<http://purl.org/dc/elements/1.1/contributor>', o: result.name});
                    meta.push({s: uri, p: '<http://purl.org/dc/elements/1.1/title>', o: data['title']});
                    rdfstore.$(html).rdf().where('?s ?p ?o').each(function(index,value){
                        //console.log("s: " + value.s.value + " p:" + value.p.value + " o:" + value.o.value);
                        var s = _.isObject(value.s.value) ? '<'+value.s.value._string+'>' : value.s.value;
                        var p = _.isObject(value.p.value) ? '<'+value.p.value._string+'>' : value.p.value;
                        var o = _.isObject(value.o.value) ? '<'+value.o.value._string+'>' : value.o.value;
                        meta.push({s: s, p: p, o: o});
                    });
                    //console.log(meta);
                    data['meta'] = meta;

                    //console.log(data);
                    // DOM
                    jsdom.env(data['article'], function (errors, window) {
                        if (errors && errors.length > 0) {
                            console.log(errors);
                        }
                        // extract JSON-LD from RDFa
                        RDFa.attach(window.document);
                        //console.log(window.document.data);
                        // create JSON-LD from RDF
                        jsonld.fromRDF(window.document.data,
                            {format: 'rdfa-api'}, function (error, data) {
                                //console.log(error);
                                console.log(data);

                                store.load("application/ld+json", data, url, function(success, results) {

                                });
                            });
                    });

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
                    dao.users.findById(data.userid, function (error, result) {
                        if (typeof data_orig['article'] !== "undefined")
                            data['article'] = data_orig.article;
                        if (typeof data_orig['app'] !== "undefined")
                            data['app'] = data_orig.app;
                        if (typeof data_orig['title'] !== "undefined")
                            data['title'] = data_orig.title;
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
            dao.pages.findById(pageid,{cache: 1}).next(function (page) {
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
            dao.pages.findById(pageid,{meta: 1}).next(function (page) {
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
            dao.pages.findById(pageid,{article:1}).next(function (page) {
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
                            console.log(msg);
                            res.send({status: "ok"});
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
                    res.send({status:"ok"});
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
        search_meta: function (req,res) {
            // 1) load all meta
            // 2) rdfstore from dump
            // 3) request
            var value = req.body.value === undefined ? "Don Tapscott" : req.body.value;

            var bank = rdfstore.$.rdf()
                .base('http://wikinext.gexsoft.com/')
                .prefix('dc', 'http://purl.org/dc/elements/1.1/')
                .prefix('foaf', 'http://xmlns.com/foaf/0.1/');
            dao.pages.findAllWithParameters({meta : 1}).next(function(pages){
                _.each(pages, function (page) {
                    //console.log(page);
                    if (_.isArray(page.meta)) {
                        //console.log(page.meta);
                        _.each(page.meta, function(value) {
                            //console.log(value);
                            var s = value.s[0] === '<' ? value.s : '"'+value.s+'"';
                            var p = value.p[0] === '<' ? value.p : '"'+value.p+'"';
                            var o = value.o[0] === '<' ? value.o : '"'+value.o+'"';
                            var triple = s+' '+p+' '+o+' .';
                            //console.log(triple);
                            bank.add(triple);
                        });
                    }
                });
                //console.log(bank);
//                bank.where('?s ?p ?o').each(function(index,value){
//                    console.log("s: " + value.s.value + " p:" + value.p.value + " o:" + value.o.value);
//                });

                var predict = [];
                bank.where('?x ?predict ?name').filter('name',value).each(function(index, value){
                    predict.push(value.x.value._string);
                });
                //console.log(predict);
                var result = [];
                _.each(predict,function(value){
                    var result_part = [];
                    bank.about('<'+value+'>').each(function(value,k) {
                        //console.log(k.property + " = " +  k.value.value);
                        result_part.push({p: k.property, v: k.value.value});
                    });
                    result.push({p:value,r:result_part});
                });
                res.send(result);
            });
        },
        endpoint: function (req, res) {
            var query = req.body.query;
            //console.log(query);
            store.execute(query, function (success, results) {
                //console.log(results);
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
        }
    };
};
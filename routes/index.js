/*
 * GET home page.
 */

var Deferred = require('jsdeferred').Deferred;
var jQuery = require('jquery');

var formidable = require('formidable'),
    util = require('util');

var fs = require('fs');

var path = require('path');

//var encoder = require('../lib/encoderHTML');
var crypto = require('crypto');
var _ = require('underscore');

var winston = require('winston');
//winston.add(winston.transports.File, { filename: 'debug.log' });

function in_array (needle, haystack, argStrict) {
    var key = '',
        strict = !! argStrict;

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
        index:function (req, res) {
            var userid = "";
            var run = {
                main_pages:dao.pages.findMain()
            };
            if (req.session.auth) {
                userid = req.session.auth.userId;
                run['user_pages'] = dao.pages.findAllByUserId(userid);
            }
            Deferred.parallel(run)
                .next(function (data) {
                    res.render('index.html', {
                        locals:{
                            title:'WikiNEXT V2',
                            auth:req.session.auth,
                            login:req.session.auth ? false : true,
                            pages:data['main_pages'],
                            user_pages:data['user_pages']
                        }});
                });

        },
        wiki:function (req, res) {
            var run = {
                page:dao.pages.findById(req.params.id),
                pages:dao.pages.findByParent(req.params.id),
                libraries:dao.jslibraries.findAll()
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
                        return dao.pages.findByIdLimited(parentid, {title:1, parent:1}).next(function (parent_page) {
                            //console.log('add nav');
                            page['nav'].unshift({
                                _id:parent_page._id.toString(),
                                title:parent_page.title
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
                        _.each(libraries,function(value,key){
                            if (in_array(value._id.toString(),page['libraries'])){
                                page['js'].push({src:value.name});
                            }
                        });
                    }

                    console.log(page);

                    res.render('wiki.html', {
                        locals:{
                            page_id:page._id,
                            title:'WikiNEXT V2',
                            auth:req.session.auth,
                            login:req.session.auth ? false : true,
                            page:page,
                            pages:pages,
                            libraries:libraries
                        }});
                });
        },
        create:function (req, res) {
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
        edit:function (req, res) {
            //console.log("edit");
            if (req.session.auth) {
                var data = {};
                data.userid = req.session.auth.userId;
                dao.users.findById(data.userid, function (error, result) {
                    data.last_modified_by = {
                        name:result.name
                    };
                    var run = {
                        page:dao.pages.findById(req.params.id),
                        libraries:dao.jslibraries.findAll()
                    };
                    Deferred.parallel(run).next(function (data) {
                        winston.info(data['libraries']);
                        winston.info(data['page']);
                        _.each(data['libraries'],function(value,key){
                            if (in_array(value._id.toString(),data['page']['libraries'])){
                                data['libraries'][key].plugged = "unplug";
                            }
                            else {
                                data['libraries'][key].plugged = "plug";
                            }
                        });

                        res.render('edit.html', {
                            locals:{
                                title:'WikiNEXT V2',
                                auth:req.session.auth,
                                login:req.session.auth ? false : true,
                                page:data['page'],
                                page_id:data['page']['_id'],
                                libraries:data['libraries']
                            }});
                    });
                });
            } else {
                res.redirect("/");
            }
        },
        upload:function (req, res) {
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
                    if (!path.existsSync(path_upload + pageid)) {
                        fs.mkdirSync(path_upload + pageid);
                    }

                    var ws = fs.createWriteStream(path_upload + pageid + '/' + fName);

                    req.on('data', function (data) {
                        console.log('data arrived');
                        ws.write(data);
                    });
                    req.on('end', function () {
                        console.log("finished");
                        res.writeHead(200, { 'Content-Type':'application/json' });
                        res.end(JSON.stringify({
                            success:true
                        }));
                        dao.pages.attachFile(pageid, {"index":crypto.createHash('md5').update(fName).digest("hex"), "path":'upload/' + pageid, "type":fType, "name":fName, "uploaded_at":new Date()}, function (data) {
                            if (data != null)
                                console.log(data);
                            else
                                console.log("information to db was successfully added")
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
        save:function (req, res) {
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

                    dao.pages.update(data, function (error, result) {
                        if (error != undefined)
                            console.log("Got an error: " + error);
                        var version = {
                            article:result.article,
                            app:result.app,
                            title:result.title,
                            version:result.version,
                            saved_by:data['last_modified_by'],
                            saved_at:new Date()
                        };
                        dao.pageversions.insert(req.params.id, data.userid, version, function (error, result) {
                            res.send({status:"ok"});
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
        clone:function (req, res) {
            if (req.session.auth) {
                var run = {
                    page:dao.pages.findById(req.params.id)
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
                        if (typeof data_orig['jsl_id'] !== "undefined")
                            data['jsl_id'] = data_orig.jsl_id;
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
        deleteattach:function (req, res) {
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
                if (path.existsSync(path_upload + pageid)) {
                    //console.log("directory exists");
                    var filepath = path_upload + pageid + '/' + page.attach[i].name;
                    if (path.existsSync(filepath)) {
                        //console.log("delete "+filepath);
                        fs.unlinkSync(filepath);
                    }
                }

                dao.pages.deattachFile(pageid, index, function (data) {
                    if (data != null) {
                        //console.log(data);
                        res.send({status:"ko", error:data});
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
        attach_library:function (req, res) {
            // received from page
            var pageid = req.body.pageid;
            var libraryid = req.body.libraryid;

            // need to find all information in our database
            var find_information = {
                page : dao.pages.findById(pageid),
                library: dao.jslibraries.findById(libraryid)
            };

            // run queries
            Deferred.parallel(find_information).next(function(data){
                //console.log(data['page']);
                //console.log(data['library']);
                // do we have already this library attached to the page?
                if (_.isArray(data['page']['libraries'])) {
                    if (!in_array(libraryid,data['page']['libraries'])) {
                        dao.pages.plugJSLibrary(pageid,libraryid).next(function(){
                            res.send({status:"ok"});
                        }).error(function(error){
                                res.send({status:"ko",error:error})
                            });
                    }
                    else {
                        dao.pages.unplugJSLibrary(pageid, libraryid).next(function(){
                            res.send({status:"ok"});
                        }).error(function(error){
                                res.send({status:"ko",error:error});
                            });
                    }
                }
                else {
                    dao.pages.plugJSLibrary(pageid,libraryid);
                }

            });

        }
    };
};
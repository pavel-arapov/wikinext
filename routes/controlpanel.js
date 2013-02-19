/*
 Control panel actions
 */
// deferred system to have call stack
var Deferred = require('jsdeferred').Deferred;
// logging system
var winston = require('winston');
// helper...
var _ = require('underscore');

module.exports = function (dao) {
    return {
        index:function (req, res) {

        },
        /**
         * List of available js libraries
         * @param req   HTTP request
         * @param res   HTTP response
         */
        jslibraries:function (req, res) {
            // load necessary data
            var run = {
                libraries:dao.jslibraries.findAll()
            };
            Deferred.parallel(run).next(function (data) {
                libraries = data['libraries'];
            }).next(function () {
                    //page's construction
                    res.render('cp/jslibraries.html', {
                        locals:{
                            title:'WikiNEXT V2',
                            auth:req.session.auth,
                            login:req.session.auth ? false : true,
                            libraries:libraries
                        }});
                });
        },
        /**
         * Add new js library
         * @param req
         * @param res
         */
        add_js_library:function (req, res) {
            if (req.session.auth) {
                var data = {};
                data.userid = req.session.auth.userId;

                //winston.info('Session', req.session.auth);

                if (!_.isUndefined(req.body.name))
                    data.name = req.body.name;

                if (!_.isUndefined(req.body.description))
                    data.description  = req.body.description;

                dao.jslibraries.insert(data, function (error, result) {
                    if (error != undefined)
                        console.log("Got an error: " + error);
                    res.redirect("/cp/jslibraries");
                });
            } else {
                res.redirect("/");
            }
        },
        /**
         * Delete js library
         * @param req
         * @param res
         */
        delete_js_library:function(req,res) {
            if (req.session.auth) {
                var jslib = req.body.jslibid;
                dao.jslibraries.delete(jslib,function(error){
                    console.log(error);
                });
                res.send({status:"ok"});
                //res.redirect("/cp/jslibraries");
            } else {
                res.redirect("/");
            }
        },
        users:function(req,res) {
            if (req.session.auth) {
                // load necessary data
                var run = {
                    users:dao.users.findAll()
                };
                var users;
                Deferred.parallel(run).next(function (data) {
                    users = data['users'];
                }).next(function () {
                        //page's construction
                        console.log(users);
                        res.render('cp/users.html', {
                            locals:{
                                title:'WikiNEXT V2',
                                auth:req.session.auth,
                                login:req.session.auth ? false : true,
                                users:users
                            }});
                    });
            }
        }
    }
};
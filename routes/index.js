
/*
 * GET home page.
 */

var Deferred = require('jsdeferred').Deferred;
var jQuery = require('jquery');

var formidable = require('formidable'),
    util = require('util');

var fs = require('fs');

module.exports = function(dao){
    return {
        index:function (req, res) {
            dao.pages.findAll().next(function(pages){
                res.render('index.html', {
                    locals:{
                        title:'WikiNEXT V2',
                        auth:req.session.auth,
                        login:req.session.auth ? false : true,
                        pages:pages
                    }});
            });

        },
        wiki:function (req, res) {
            //console.log(req.params.id);
            dao.pages.findById(req.params.id).next(function(page){
                res.render('wiki.html', {
                    locals:{
                        title:'WikiNEXT V2',
                        auth:req.session.auth,
                        login:req.session.auth ? false : true,
                        page:page
                    }});
            });

        },
        create:function(req,res){
            if (req.session.auth) {
                var data = {};
                data.userid = req.session.auth.userId;
                //console.log(req.session.auth.userId);
                data.title = "new page";
                dao.pages.insert(data, function (error, result) {
                    if (error != undefined)
                        console.log("Got an error: " + error);
                    //console.log(result);
                    //console.log(result[0]._id);
                    res.redirect("/wiki/"+result[0]._id);
                    //console.log(result);
//                    datalog.userid = data.userid;
//                    datalog.page_info = {};
//                    datalog.page_info.id = result[0]._id;
//                    datalog.page_info.title = data.title;
//                    datalog.pageid = datalog.page_info.id;
//                    datalog.action = "create";
//                    datalog.date = new Date();
                    //console.log(datalog);
//                    dao.users.findById(data.userid, function (error, r) {
//                        datalog.user_info = {};
//                        datalog.user_info.name = r.name;
//                        logs.insert(db, datalog, function (error, r) {
//                            if (error != undefined)
//                                console.log("Got an error: " + error);
//
//                        });
//                    });

                });
            } else {
                res.redirect("/");
            }
        },
        edit:function(req,res){
            //console.log("edit");
            if (req.session.auth) {
                var data = {};
                data.userid = req.session.auth.userId;
                dao.pages.findById(req.params.id).next(function(page){
                    res.render('edit.html', {
                        locals:{
                            title:'WikiNEXT V2',
                            auth:req.session.auth,
                            login:req.session.auth ? false : true,
                            page:page
                        }});
                });
            } else {
                res.redirect("/");
            }
        },
        upload:function(req,res,next){
            if(req.xhr) {
                console.log('Uploading...');
                var fName = req.header('x-file-name');
                var fSize = req.header('x-file-size');
                var fType = req.header('x-file-type');
                var ws = fs.createWriteStream('public/upload/'+fName)

                req.on('data', function(data) {
                    console.log('data arrived');
                    ws.write(data);
                });
                req.on('end', function() {
                    console.log("finished");
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true
                    }));
                });
            }

//            var form = new formidable.IncomingForm();
//
//            form.uploadDir = __dirname + '/upload/';
//
//            form.on('file', function (field, file) {
//                //rename the incoming file to the file's name
//                fs.rename(file.path, form.uploadDir + "/" + file.name);
//            })
//                .on('error', function (err) {
//                    console.log("an error has occured with form upload");
//                    console.log(err);
//                    req.resume();
//                })
//                .on('aborted', function (err) {
//                    console.log("user aborted upload");
//                })
//                .on('end', function () {
//                    console.log('-> upload done');
//                    dao.pages.attachImage(fields.pageid, {"path":file.image.name, "type":file.image.type, "name":file.image.name}, function (data) {
//                        console.log("information to db was succesefully added")
//                    });
//                });




            // parse a file upload
//            var form = new formidable.IncomingForm();
//            form.parse(req, function(err, fields, files) {
//                res.writeHead(200, {'content-type': 'text/plain'});
//                res.write('received upload:\n\n');
//                res.end(util.inspect({fields: fields, files: files}));
//                fs.rename(files.image.path, "public/upload/"+files.image.name, function (err) { throw err; });
//                dao.pages.attachImage(fields.pageid, {"path":files.image.name,"type":files.image.type,"name":files.image.name}, function(data){
//                    console.log("information to db was succesefully added");
//                });
//            });
        }

    };
};
//
//exports.index = function(req, res){
//    //console.log(req.session);
//
//};
//
//exports.page = function(req, res){
//
//};
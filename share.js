require('coffee-script');
var express = require('express')
    , sharejs = require('share').server
    , mustache = require('mustache')
    , Deferred = require('jsdeferred').Deferred
    , mongo = require('mongoskin')
    , winston = require('winston')
    , parseCookie = require('connect').utils.parseCookie
    , MongoStore = require('connect-mongodb');

require('./config.settings'); // include settings

winston.add(winston.transports.File, { filename: config.logger_file });
winston.info('WikiNEXTSync is starting');

//var server = connect(
//    connect.logger(),
//    connect.static(__dirname + '/../codemirror')
//);

var db = mongo.db(process.env.MONGOLAB_URI || config.mongo_uri);
var mongoStore = new MongoStore({db:db.db});

//DAO
var dao = {};
dao.users = require('./lib/dao/users.js')(db);
dao.pages = require('./lib/dao/pages.js')(db);
dao.pageversions = require('./lib/dao/pageversions.js')(db);
dao.jslibraries = require('./lib/dao/jslibraries.js')(db);
dao.meta = require('./lib/dao/meta.js')(db);

var app = module.exports = express.createServer();

//template engine redefinition

var tmpl = {
    compile: function (source, options) {
        if (typeof source == 'string') {
            return function(options) {
                options.locals = options.locals || {};
                options.partials = options.partials || {};
                if (options.body) // for express.js > v1.0
                    locals.body = options.body;
                return mustache.to_html(
                    source, options.locals, options.partials);
            };
        } else {
            return source;
        }
    },
    render: function (template, options) {
        template = this.compile(template, options);
        return template(options);
    }
};

// Configuration

app.configure(function () {
    app.set('views', __dirname + '/views');
    //app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser("nothing is permitted"));
    app.use(express.session(
        {
            secret:process.env.SESSION_SECRET || 'wikinextSecret438271872487',
            cookie: { domain: config.cookie_domain },
            store:mongoStore
        }));
//    app.use(everyauth.middleware());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
    app.set("view options", {layout:false});
    app.use({ keepExtensions: true });
    app.register(".html", tmpl);
});

//everyauth.helpExpress(app);

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
});

app.configure('production', function () {
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
});

// Routes

var routes = require('./routes')(dao);

app.get('/', function(req,res){
    res.redirect(config.host_uri);
});
app.get('/home', function(req,res){
    res.redirect(config.host_uri+"/home");
});
//app.get('/create',routes.create);
app.get('/wiki/:id', function(req,res){
    res.redirect(config.host_uri+"/wiki/"+req.params.id);
});
app.get('/logout', function(req,res){
    res.redirect(config.host_uri+"/logout");
});
app.get('/wiki/:id/edit',routes.edit);
app.get('/wiki/:id/app',routes.app);
app.post('/wiki/:id/save',routes.save);
app.post('/upload',routes.upload);
app.post('/deleteattach',routes.deleteattach);
app.post('/attachlibrary',routes.attach_library);
app.post('/update_cache',routes.update_cache);
app.post('/change_parent',routes.updateParent);
// tree
app.get('/links',routes.loadPagesTree);

var port = process.env.PORT || config.port_sharejs;
app.listen(port, function () {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

var timeout;

var sharejs_auth = function(agent,action){

//    if (action.type == 'connect'){
//        var id = unescape(parseCookie(agent.headers.cookie)['connect.sid']);
//        action.accept();
//        mongoStore.get(id, function(err, sess){
//            if (err){
//                console.log(err.toString());
//                console.log("reject");
//            }
//            else{
//            }
//            finished = true;
//        });
//
//        console.log("return");
//    }
//    else {
       // action.accept();
//    }
    return action;
};
//
//var share_js_deferred = function (agent, action){
//    Deferred.next(function() {
//        return sharejs_auth(agent,action);
//    });
//}

var options = {db: {type: 'none'}, auth: sharejs_auth}; // See docs for options. {type: 'redis'} to enable persistance.
// Attach the sharejs REST and Socket.io interfaces to the server
sharejs.attach(app, options);

//var client = require('share').client;
//
//client.open('4fd5dbf585dcbff208000001', 'text', {host: config.host_sync_uri, port: config.port_sharejs}, function(doc, error) {
//    // Insert some text at the start of the document (position 0):
////    doc.submitOp({i:"Hi there!\n", p:0});
//
//    // Get the contents of the document for some reason:
////    console.log(doc.snapshot);
//
//    doc.on('change', function(op) {
//        var data = [];
//        data['_id'] = '4fd5dbf585dcbff208000001';
//        data['article'] = doc.snapshot;
//        dao.pages.update(data, function (error, result) {
//            if (error != undefined)
//                console.log("Got an error: " + error);
//
//        });
////        console.log('Version: ' + doc.version);
//    });
//});
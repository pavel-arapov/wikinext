require('coffee-script');
var express = require('express')
    , sharejs = require('share').server
    , mustache = require('mustache')
    , Deferred = require('jsdeferred').Deferred
    , mongo = require('mongoskin')
    , MongoStore = require('connect-mongodb');

require('./config.settings'); // include settings

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
            cookie: { domain:'.gexsoft.com'},
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
    app.use(express.errorHandler());
});

// Routes

var routes = require('./routes')(dao);

app.get('/', routes.index);
app.get('/home', routes.index);
app.get('/create',routes.create);
app.get('/wiki/:id',routes.wiki);
app.get('/wiki/:id/edit',routes.edit);

//app.post('/upload',routes.upload);
var options = {db: {type: 'none'}}; // See docs for options. {type: 'redis'} to enable persistance.
// Attach the sharejs REST and Socket.io interfaces to the server
sharejs.attach(app, options);

var port = process.env.PORT || config.port_sharejs;
app.listen(port, function () {
    console.log("Express server listening on port %d in %s mode", app.address().port_sharejs, app.settings.env);
});

//var port = process.env.PORT || 3000;
//server.listen(port);
//console.log('Server running at http://127.0.0.1:' + port);
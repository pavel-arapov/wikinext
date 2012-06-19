/**
 * Module dependencies.
 */

var express = require('express')
    , Deferred = require('jsdeferred').Deferred
    , nowjs = require('now')
    , mongo = require('mongoskin')
    , everyauth = require('everyauth')
    , vie = require('vie')
    , jQuery = require('jquery')
    , mustache = require('mustache')
    , winston = require('winston')
    , MongoStore = require('connect-mongodb'); // sessions for express

require('./config.settings'); // include settings

winston.add(winston.transports.File, { filename: config.logger_file });
winston.info('WikiNEXT is starting');

var app = module.exports = express.createServer();
//var db = require('mongoskin').db('dewey:tehrock@localhost:27017/rockband');
var db = mongo.db(process.env.MONGOLAB_URI || config.mongo_uri);
var mongoStore = new MongoStore({db:db.db});

//DAO
var dao = {};
dao.users = require('./lib/dao/users.js')(db);
dao.pages = require('./lib/dao/pages.js')(db);
dao.pageversions = require('./lib/dao/pageversions.js')(db);

var port = process.env.PORT || config.port;

// configure facebook authentication

everyauth.facebook
    .appId(process.env.FACEBOOK_APP_ID || config.FACEBOOK.APP_ID)
    .appSecret(process.env.FACEBOOK_SECRET || config.FACEBOOK.SECRET)
    .scope('email')
    //.entryPath('/')
    .redirectPath('/home')
    .findOrCreateUser(function (session, accessToken, accessTokenExtra, fbUserMetadata) {
        var userPromise = this.Promise();
        /*
         Looking by fbUserMetadata.id in the database or create new user
         */
        dao.users.findByFBId(fbUserMetadata.id, function(error, found_user) {
            if (error)
                return userPromise.fail(error);
            if (found_user){
                session.userId = found_user._id;
                found_user.id = found_user._id;
                //console.log(found_user);
                return userPromise.fulfill(found_user);
            }
            else{
                var our_user = {
                    'fbid':fbUserMetadata.id,
                    'name':fbUserMetadata.name,
                    'link':fbUserMetadata.link,
                    'verified':fbUserMetadata.verified
                };
                dao.users.insert(our_user, function(error, inserted_user) {
                    if (error) return userPromise.fail(error);
                    session.userId = inserted_user._id;
                    inserted_user.id = inserted_user._id;
                    return userPromise.fulfill(inserted_user);
                });
            }
        });
        return userPromise;});

//// эта фигня вызывается при КАЖДОМ запросе сервера :-(
//everyauth.everymodule.findUserById( function (userId, callback) {
//    console.log("find by id");
//    console.log(userId);
//    users.findById(db,userId,callback);
//});

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
    app.use(everyauth.middleware());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
    app.set("view options", {layout:false});
    app.use({ keepExtensions: true });
    app.register(".html", tmpl);
});

everyauth.helpExpress(app);

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
app.post('/create',routes.create);
app.get('/wiki/:id',routes.wiki);
app.get('/wiki/:id/edit',function(req,res){
    res.redirect(config.host_sync_uri+"/wiki/"+req.params.id+"/edit");
});

//app.post('/upload',routes.upload);

app.listen(port, function () {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

var everyone = nowjs.initialize(app, {socketio:{transports:['websocket', 'xhr-polling', 'jsonp-polling']}});


// looking for a same user session for nowjs

var clients = {};
nowjs.on('connect', function () {
    var self = this;
    clients[self.user.clientId] = {};
    var id = unescape(this.user.cookie['connect.sid']);
    //console.log("Session ID: "+id);
    //console.log(this.user);
    mongoStore.get(id, function(err, sess){
        if (err)
            console.log(err.toString());
        else{
            //console.log("That user who joined? his userId is "+sess.auth.userId);
            //console.log(sess);
            clients[self.user.clientId].sess = sess;
        }
    });
});

nowjs.on('disconnect', function () {
    for (var i in clients) {
        if (i == this.user.clientId) {
            delete clients[i];
            break;
        }
    }
});


everyone.now.save_page = function(data){
    //console.log(data);
    var self = this;
    dao.pages.update(data, function (error, result) {
        if (error != undefined)
            console.log("Got an error: " + error);

    });
};

var default_code = 'var app=function(){var a={};return{init:function(){a.name="Application"},render:function(){ich.app_defaultTemplate(a)}}};app.render()';
var default_template = '<b>{{name}}</b>';

everyone.now.create_app = function(data){
    //_id - pageid
    //name - application name
    //надо выбрать массив с приложениями и добавить туда новое приложение
    //необходимо приложение по умолчанию
    //структура: app = { name: "", code: "", templates: [] }
    //console.log("create app");
    var self = this;
    dao.pages.findById(data.page_id).next(
        function(page){
            //console.log(page);
            var apps = [];
            var app = {
                name: data.app_name,
                code: default_code,
                templates: [{
                        name: "app_defaultTemplate",
                        template: default_template
                    }
                ]
            };
            if (typeof page['apps'] === "undefined"){
                apps.push(app);
            } else {
                apps = page['apps'];
                apps.push(app);
            }
            page.apps = apps;
            console.log(page);
            page._id = page._id.toString();
            dao.pages.update(page, function (error, result) {
                if (error != undefined)
                    console.log("Got an error: " + error);
                console.log(app);
                self.now.app_was_created(app);
            });
        }
    );
};


var default_page = {
    title: "new page",
    article: "html article",
    created_by: {},
    created_at: new Date(),
    last_modified_at: new Date(),
    last_modified_by:{},
    version:"",
    apps:[
        {
            id:"",
            title:"Application name",
            description:"Application description",
            created_by:new Date(),
            created_at:{},
            last_modified_at:new Date(),
            last_modified_by:{},
            templates:[
                {
                    id:"",
                    template:"",
                    created_by:new Date(),
                    created_at:{},
                    last_modified_at:new Date(),
                    last_modified_by:{}
                }
            ]
        }
    ]
};



//// Instantiate VIE
//var VIE = new vie.VIE();
//
//// Enable the RDFa service
//VIE.use(new VIE.RdfaService());
//
////test VIE
//var html = jQuery('<p xmlns:dc="http://purl.org/dc/elements/1.1/" about="http://www.example.com/books/wikinomics">In his latest book <cite property="dc:title">Wikinomics</cite>, <span property="dc:creator">Don Tapscott</span> explains deep changes in technology, demographics and business.</p>');
//
////
//VIE.load({element: html}).from('rdfa').execute().done(function() {
//    var objectInstance = VIE.entities.get('http://www.example.com/books/wikinomics');
//    console.log(objectInstance.get('dc:title') + " by " + objectInstance.get('dc:creator'));
//});
//
//var html2 = jQuery('<div id="myarticle" typeof="http://rdfs.org/sioc/ns#Post" about="http://example.net/blog/news_item"><h1 property="dcterms:title">News item title</h1><div property="sioc:content">News item contents</div></div>');
//var v = new vie.VIE();
//v.use(new VIE.RdfaService());
//v.load({element: html2}).from('rdfa').execute().success(function(entities) {
//    entities.forEach(function(entity) {
//        console.log(entity.toJSONLD());
//        entity.set({'dcterms:title': 'Hello, world'});
////        entity.save(null, {
////            success: function(savedModel, response) {
////                alert("Your article '" + savedModel.get('dcterms:title') + "' was saved to server");
////            }
////        });
//    });
//    console.log("We got " + entities.length + " editable objects from the page");
//});
////test deferred
//var k = function(){
//    var d = new Deferred();
//    console.log("wait");
//    setTimeout(function(){
//        d.call();
//    },1000);
//    console.log("waited");
//    return d;
//};
//
//k().next(function(){
//    console.log("done");
//});

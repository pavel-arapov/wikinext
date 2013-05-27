/**
 * Module dependencies.
 */
var express = require('express')
    , Deferred = require('jsdeferred').Deferred
    , mongo = require('mongoskin')
    , everyauth = require('everyauth')
    , vie = require('vie')
    , jQuery = require('./lib/jquery/node-jquery.js')
    , mustache = require('mustache')
    , winston = require('winston')
    , _ = require('underscore')
    , rdfstore = require('./lib/rdfquery/jquery.rdfquery.js')
    , MongoStore = require('connect-mongodb') // sessions for express
    , rdfstorejs = require('rdfstore')
    , jsonld = require('./lib/jsonld/jsonld.js')
    , RDFa = require('./lib/jsonld/rdfa.js')
    , jsdom = require('jsdom');


jsonld.use('request');

require('./config.settings'); // include settings

winston.add(winston.transports.File, { filename: config.logger_file });
winston.info('WikiNEXT is starting');

var app = module.exports = express.createServer();
//var db = require('mongoskin').db('dewey:tehrock@localhost:27017/rockband');
var db = mongo.db(process.env.MONGOLAB_URI || config.mongo_uri);
var mongoStore = new MongoStore({db: db.db});

//DAO
var dao = {};
dao.users = require('./lib/dao/users.js')(db);
dao.pages = require('./lib/dao/pages.js')(db);
dao.pageversions = require('./lib/dao/pageversions.js')(db);
dao.jslibraries = require('./lib/dao/jslibraries.js')(db);
dao.quads = require('./lib/dao/quads.js')(db);

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
        dao.users.findByFBId(fbUserMetadata.id, function (error, found_user) {
            if (error)
                userPromise.fail(error);
            if (found_user) {
                session.userId = found_user._id;
                found_user.id = found_user._id;
                // d(found_user);
                userPromise.fulfill(found_user);
            }
            else {
                var our_user = {
                    'fbid': fbUserMetadata.id,
                    'name': fbUserMetadata.name,
                    'link': fbUserMetadata.link,
                    'email': fbUserMetadata.email,
                    'gender': fbUserMetadata.gender,
                    'locale': fbUserMetadata.locale,
                    'work': typeof fbUserMetadata.work === 'undefined' ? "" : fbUserMetadata.work,
                    'education': typeof fbUserMetadata.education === 'undefined' ? "" : fbUserMetadata.education,
                    'verified': fbUserMetadata.verified
                };
                dao.users.insert(our_user, function (error, inserted_user) {
                    if (error) return userPromise.fail(error);
                    session.userId = inserted_user._id;
                    inserted_user.id = inserted_user._id;
                    return userPromise.fulfill(inserted_user);
                });
            }
        });
        return userPromise;
    });

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
            return function (options) {
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
            secret: process.env.SESSION_SECRET || 'wikinextSecret438271872487',
            cookie: { domain: config.cookie_domain },
            store: mongoStore
        }));
    app.use(everyauth.middleware());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
    app.set("view options", {layout: false});
    app.use({ keepExtensions: true });
    app.register(".html", tmpl);
});

everyauth.helpExpress(app);

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});

// Routes

var routes = require('./routes')(dao);
var cp = require('./routes/controlpanel.js')(dao);

//base navigation
app.get('/', routes.index);
app.get('/home', routes.index);
app.get('/wiki/:id', routes.wiki);
app.get('/wiki/:id/clone', routes.clone);
app.get('/wiki/:id/remove', routes.remove);
app.get('/wiki/:id/edit', function (req, res) {
    res.redirect(config.host_sync_uri + "/wiki/" + req.params.id + "/edit");
});
app.get('/user/:id', routes.user);

// control panel
// js libraries
app.get('/cp/jslibraries', cp.jslibraries);
app.post('/cp/jslibraries/add', cp.add_js_library);
app.post('/cp/jslibraries/delete', cp.delete_js_library);
// users
app.get('/cp/users', cp.users);

// API function
// cache
app.post('/update_cache', routes.update_cache);
app.post('/load_cache', routes.load_cache);
// meta
app.post('/load_meta', routes.load_meta);
// template
app.post('/load_template', routes.load_template);
// page
app.post('/create', routes.create);
app.post('/change_parent', routes.updateParent);
// tree
app.get('/links', routes.loadPagesTree);
// search
app.post('/search_meta', routes.search_meta);
// endpoint
app.post('/endpoint', routes.endpoint);
// full information about defined URI
app.post('/uri', routes.uri);
// find the id of a page
app.post('/find', routes.find);
// save the page
app.post('/wiki/:id/save',routes.save);

app.listen(port, function () {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

//var everyone = nowjs.initialize(app, {socketio:{transports:['websocket', 'xhr-polling', 'jsonp-polling']}});

// looking for a same user session for nowjs

var clients = {};
//nowjs.on('connect', function () {
//    var self = this;
//    clients[self.user.clientId] = {};
//    var id = unescape(this.user.cookie['connect.sid']);
//    //console.log("Session ID: "+id);
//    //console.log(this.user);
//    mongoStore.get(id, function(err, sess){
//        if (err)
//            console.log(err.toString());
//        else{
//            //console.log("That user who joined? his userId is "+sess.auth.userId);
//            //console.log(sess);
//            clients[self.user.clientId].sess = sess;
//        }
//    });
//});
//
//nowjs.on('disconnect', function () {
//    for (var i in clients) {
//        if (i == this.user.clientId) {
//            delete clients[i];
//            break;
//        }
//    }
//});


//everyone.now.save_page = function(data){
//    //console.log(data);
//    var self = this;
//    dao.pages.update(data, function (error, result) {
//        if (error != undefined)
//            console.log("Got an error: " + error);
//
//    });
//};

//var default_code = 'var app=function(){var a={};return{init:function(){a.name="Application"},render:function(){ich.app_defaultTemplate(a)}}};app.render()';
//var default_template = '<b>{{name}}</b>';

//everyone.now.create_app = function(data){
//    //_id - pageid
//    //name - application name
//    //надо выбрать массив с приложениями и добавить туда новое приложение
//    //необходимо приложение по умолчанию
//    //структура: app = { name: "", code: "", templates: [] }
//    //console.log("create app");
//    var self = this;
//    dao.pages.findById(data.page_id).next(
//        function(page){
//            //console.log(page);
//            var apps = [];
//            var app = {
//                name: data.app_name,
//                code: default_code,
//                templates: [{
//                        name: "app_defaultTemplate",
//                        template: default_template
//                    }
//                ]
//            };
//            if (typeof page['apps'] === "undefined"){
//                apps.push(app);
//            } else {
//                apps = page['apps'];
//                apps.push(app);
//            }
//            page.apps = apps;
//            console.log(page);
//            page._id = page._id.toString();
//            dao.pages.update(page, function (error, result) {
//                if (error != undefined)
//                    console.log("Got an error: " + error);
//                console.log(app);
//                self.now.app_was_created(app);
//            });
//        }
//    );
//};

// not in use
//var default_page = {
//    title: "new page",
//    article: "html article",
//    created_by: {},
//    created_at: new Date(),
//    last_modified_at: new Date(),
//    last_modified_by:{},
//    version:"",
//    apps:[
//        {
//            id:"",
//            title:"Application name",
//            description:"Application description",
//            created_by:new Date(),
//            created_at:{},
//            last_modified_at:new Date(),
//            last_modified_by:{},
//            templates:[
//                {
//                    id:"",
//                    template:"",
//                    created_by:new Date(),
//                    created_at:{},
//                    last_modified_at:new Date(),
//                    last_modified_by:{}
//                }
//            ]
//        }
//    ]
//};

//var data = '<p xmlns:dc="http://purl.org/dc/elements/1.1/" about="http://www.example.com/books/wikinomics">In his latest book <cite property="dc:title">Wikinomics</cite>, <span property="dc:creator">Don Tapscott</span> explains deep changes in technology, demographics and business.</p>';
//var data = '<div id="myarticle" typeof="http://rdfs.org/sioc/ns#Post" about="http://example.net/blog/news_item" xmlns:sioc="http://rdfs.org/sioc/ns"><h1 property="dcterms:title">News item title</h1><div property="sioc:content">News item contents</div></div><p xmlns:dc="http://purl.org/dc/elements/1.1/" about="http://www.example.com/books/wikinomics">In his latest book <cite property="dc:title">Wikinomics</cite>, <span property="dc:creator">Don Tapscott</span> explains deep changes in technology, demographics and business.</p>';
//
//
//
//new rdfstorejs.Store({
//    persistent: true,
//    engine: 'mongodb',
//    name: 'rdfstore',
//    overwrite: false,    // delete all the data already present in the MongoDB server
//    mongoDomain: 'localhost', // location of the MongoDB instance, localhost by default
//    mongoPort: 27017, // port where the MongoDB server is running, 27017 by default
//    mongoDBOptions: {safe: false}
//}, function (store) {
//
//    store.execute('PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
//                     SELECT ?s ?p ?v FROM NAMED <http://wikinext.gexsoft.com/wiki/5175c973ede6842655000001> { GRAPH ?g { ?s ?p ?v } }',
//                    function (success, results) {
//                        console.log(results);
//                    });
//
////    store.execute('LOAD <http://dbpedia.org/resource/Tim_Berners-Lee> INTO GRAPH <http://example.org/people>', function () {
////
////            store.setPrefix('dbp', 'http://dbpedia.org/resource/');
////
////            store.node(store.rdf.resolve('dbp:Tim_Berners-Lee'), "http://example.org/people", function (success, graph) {
////
////                var peopleGraph = graph.filter(store.rdf.filters.type(store.rdf.resolve("foaf:Person")));
////
////                store.execute('PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
////                     PREFIX foaf: <http://xmlns.com/foaf/0.1/>\
////                     PREFIX : <http://example.org/>\
////                     SELECT ?s FROM NAMED :people { GRAPH ?g { ?s rdf:type foaf:Person } }',
////                    function (success, results) {
////                        //console.log(results);
////                        //console.log(peopleGraph.toArray());
////                        //console.log(peopleGraph.toArray()[0].subject.valueOf() === results[0].s.value);
////                    });
////            });
////        }
////    );
//
//
////    jsdom.env(data, function (errors, window) {
////        if (errors && errors.length > 0) {
////            console.log(errors);
////        }
////        // extract JSON-LD from RDFa
////        RDFa.attach(window.document);
////        //console.log(window.document.data);
////        // create JSON-LD from RDF
////        jsonld.fromRDF(window.document.data,
////            {format: 'rdfa-api'}, function (error, data) {
////                //console.log(error);
////                console.log(data);
////
////                store.load("application/ld+json", data, "a", function(success, results) {
////                    //console.log(results);
////                    store.node("http://www.example.com/books/wikinomics", "a", function(success, graph) {
////                        // process graph here
////                        console.log(graph);
////
////                    });
////
////                    store.graph("a", function(success, graph){
////                        console.log(graph);
////                    });
////
////                    store.execute('PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
////                     SELECT ?s ?p ?v FROM NAMED <a> { GRAPH ?g { ?s ?p ?v } }',
////                    function (success, results) {
////                        console.log(results);
////                    });
////                });
////            });
////    });
//});


//jsonld.request(
//    'http://wikinext.gexsoft.com/wiki/516556ff587eeef861000002',
//    {},
//    function(error,data){
//        console.log(data);
//        console.log(error);
//        var options = {};
//        options.format = 'application/nquads';
//
//        jsonld.normalize(data, options, function(error,data){
//            console.log(data);
//        });
//    }
//);


//// Instantiate VIE
//var VIE = new vie.VIE();
//
//// Enable the RDFa service
//VIE.use(new VIE.RdfaService());
//
////console.log(VIE.jQuery);
//
////console.log(rdfQuery);
////console.log(rdfstore);
//
////test VIE
//var html = jQuery('<p xmlns:dc="http://purl.org/dc/elements/1.1/" about="http://www.example.com/books/wikinomics">In his latest book <cite property="dc:title">Wikinomics</cite>, <span property="dc:creator">Don Tapscott</span> explains deep changes in technology, demographics and business.</p>');
//var html2 = jQuery('<div id="myarticle" typeof="http://rdfs.org/sioc/ns#Post" about="http://example.net/blog/news_item" xmlns:sioc="http://rdfs.org/sioc/ns"><h1 property="dcterms:title">News item title</h1><div property="sioc:content">News item contents</div></div><p xmlns:dc="http://purl.org/dc/elements/1.1/" about="http://www.example.com/books/wikinomics">In his latest book <cite property="dc:title">Wikinomics</cite>, <span property="dc:creator">Don Tapscott</span> explains deep changes in technology, demographics and business.</p>');
//
////console.log(html);
//var bank = rdfstore.$.rdf()
//    .base('http://wikinext.gexsoft.com/')
//    .prefix('dc', 'http://purl.org/dc/elements/1.1/')
//    .prefix('foaf', 'http://xmlns.com/foaf/0.1/')
//    .add('<photo1.jpg> <http://purl.org/dc/elements/1.1/creator> <http://www.blogger.com/profile/1109404> .')
//    .add('<photo3.jpg> dc:creator <http://www.blogger.com/profile/1109434> .')
//    .add('<photo1.jpg> foaf:name "Jane" .')
//    .add('<photo2.jpg> foaf:name "John" .')
//    .add('<photo3.jpg> foaf:name "Michel" .')
//    .add('<http://wikinext.gexsoft.com/wiki/1> dc:creator "Michel" .')
//    .add('<http://wikinext.gexsoft.com/wiki/1> dc:title "Title" .')
//    .add('<http://www.blogger.com/profile/1109404> foaf:img <photo1.jpg> .')
//    .add('<http://www.blogger.com/profile/1109434> foaf:img <photo3.jpg> .');
//
//var value = 'Michel';
//var predict = [];
//bank.where('?x ?predict ?name').filter('name',value).each(function(index, value){
//    predict.push(value.x.value._string);
//});
//console.log(predict);
//_.each(predict,function(value){
//    bank.about('<'+value+'>').each(function(value,k) {
//        //console.log(k.property + " = " +  k.value.value);
//    });
//});
//
//bank.about('<http://www.blogger.com/profile/1109434>').each(function(index,value){
//    //console.log(value.property + " = " + value.value.value);
//});
//
////console.log(bank.databank.dump());
//
//bank.where('?s ?p ?o').each(function(index,value){
//    console.log("s: " + value.s.value + " p:" + value.p.value + " o:" + value.o.value);
//});

//console.log(rdfstore.$(html2)//.rdf().databank.dump());
//    .rdf().prefix('dc', 'http://purl.org/dc/elements/1.1/').where('?x dc:creator ?creator'));
//console.log(rdfstore.$(html2)//.rdf().databank.dump());
//    .rdf()
//    .prefix('sioc', 'http://rdfs.org/sioc/ns')
//    .where('?uri sioc:content ?content')[0].uri.value);

//console.log(author.where('?x dc:creator ?creator'));

//var rdf = rdfstore.$.rdf()
//    .prefix('dc10', 'http://purl.org/dc/elements/1.0/')
//    .prefix('dc11', 'http://purl.org/dc/elements/1.1/>')
//    .add('_:a  dc10:title     "SPARQL Query Language Tutorial" .')
//    .add('_:a  dc10:creator   "Alice" .')
//    .add('_:b  dc11:title     "SPARQL Protocol Tutorial" .')
//    .add('_:b  dc11:creator   "Bob" .')
//    .add('_:c  dc10:title     "SPARQL" .')
//    .add('_:c  dc11:title     "SPARQL (updated)" .');
//var rdfA = rdf.where('?book dc10:title ?title');
//console.log(rdfA);

// VIE EXAMPLES (they work fine!)
//VIE.load({element: html}).from('rdfa').execute().done(function() {
//    var objectInstance = VIE.entities.get('http://www.example.com/books/wikinomics');
//    //console.log(objectInstance.get('dc:title') + " by " + objectInstance.get('dc:creator'));
//});
//
//var v = new vie.VIE();
//v.use(new VIE.RdfaService());
//v.load({element: html2}).from('rdfa').execute().success(function(entities) {
//    entities.forEach(function(entity) {
//        //console.log(entity.toJSONLD());
//        entity.set({'dcterms:title': 'Hello, world'});
//        //console.log(entity.toJSON());
//    });
//    //console.log("We got " + entities.length + " editable objects from the page");
//});
//var obj = v.entities.get('http://example.net/blog/news_item');
////console.log(obj.get('dcterms:title'));
//
//v.entities.each(function(Entity){
//    //console.log(Entity.getSubjectUri());
//});


/**
 * Here we consume schema.org and insert all triples in database
 */
//var request = require('request');
//
//var url = "http://schema.org/";
//
//var store;
//
//new rdfstorejs.Store({
//    persistent: true,
//    engine: 'mongodb',
//    name: 'wikinext',
//    overwrite: false,    // delete all the data already present in the MongoDB server
//    mongoDomain: 'localhost', // location of the MongoDB instance, localhost by default
//    mongoPort: 27017, // port where the MongoDB server is running, 27017 by default
//    mongoDBOptions: {safe: false}
//}, function (d) {
//
//    store = d;
//
//
//    request({
//        uri: "http://schema.org/docs/schema_org_rdfa.html"
//    }, function (err, res, body) {
//        var html = body;
//
//        // DOM
//        store.clear(url, function (success) {
//            jsdom.env(html, function (errors, window) {
//                if (errors && errors.length > 0) {
//                    console.log(errors);
//                }
//                window.location.href = url;
//                // extract JSON-LD from RDFa
//                RDFa.attach(window.document);
//                //console.log(window.document.data);
//                // create JSON-LD from RDF
//                jsonld.fromRDF(window.document.data,
//                    {format: 'rdfa-api'}, function (error, data) {
//                        //console.log(error);
//                        console.log(data);
//
//                        store.load("application/ld+json", data, url, function (success, results) {
//                            console.log(results);
//                        });
//                    });
//            });
//        });
//    });
//});

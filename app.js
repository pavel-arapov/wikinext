/**
 * Module dependencies.
 */
var express = require('express')
    , Deferred = require('jsdeferred').Deferred
    , mongo = require('mongoskin')
    , everyauth = require('everyauth')
//    , vie = require('vie')
    , jQuery = require('./lib/jquery/node-jquery.js')
    , mustache = require('mustache')
    , winston = require('winston')
    , _ = require('underscore')
//    , rdfstore = require('./lib/rdfquery/jquery.rdfquery.js')
    , MongoStore = require('connect-mongodb') // sessions for express
//    , rdfstorejs = require('rdfstore')
    , jsonld = require('./lib/jsonld/jsonld.js')
    , RDFa = require('./lib/jsonld/rdfa.js')
    , path = require('path')
    , fs = require('fs')
    , http = require('http')
    , jsdom = require('jsdom');

var logger = require('./lib/logger.js');

jsonld.use('request');

require('./config.settings'); // include settings

winston.add(winston.transports.File, { filename: config.logger_file });
winston.info('WikiNEXT is starting');

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


// configure facebook authentication

everyauth.facebook
    .appId(process.env.FACEBOOK_APP_ID || config.FACEBOOK.APP_ID)
    .appSecret(process.env.FACEBOOK_SECRET || config.FACEBOOK.SECRET)
    .scope('email')
    //.entryPath('/')
    .redirectPath('/redirect')
    .findOrCreateUser(function (session, accessToken, accessTokenExtra, fbUserMetadata) {
        var userPromise = this.Promise();
        /*
         Looking by fbUserMetadata.id in the database or create new user
         */
        dao.users.findByFBId(fbUserMetadata.id, function (error, found_user) {
            if (error)
                userPromise.fail(error);
            if (found_user) {
                found_user.userId = found_user._id;
                found_user.id = found_user._id;
                //console.log("FOUND");
                //console.log(found_user);
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
                dao.users.insert(our_user, function (error, inserted) {
                    if (error) {
                        logger.logger.error(error);
                        userPromise.fail(error);
                    } else {
                        var inserted_user = inserted[0]
                        inserted_user.userId = inserted_user._id;
                        inserted_user.id = inserted_user._id;
                        userPromise.fulfill(inserted_user);
                    }
                });
            }
        });
        return userPromise;
    });

var crypto = require('crypto');

everyauth.password
    .loginWith('email')
    .getLoginPath('/login') // Uri path to the login page
    .postLoginPath('/login') // Uri path that your login form POSTs to
    .loginView('login')
    .authenticate( function (email, password) {
        var hash_password = crypto.createHash('md5').update(password).digest('hex');

        var userPromise = this.Promise();
        dao.users.findByEmailAndPassword(email, hash_password, function (error, found_user) {
            if (error) {
                logger.logger.error(error);
                userPromise.fulfill([error]);
            }
            if (found_user) {
                userPromise.fulfill(found_user);
            } else
                userPromise.fulfill(["Check credentials"]);
        });
        return userPromise;

        // Either, we return a user or an array of errors if doing sync auth.
        // Or, we return a Promise that can fulfill to promise.fulfill(user) or promise.fulfill(errors)
        // `errors` is an array of error message strings
        //
        // e.g.,
        // Example 1 - Sync Example
        // if (usersByLogin[login] && usersByLogin[login].password === password) {
        //   return usersByLogin[login];
        // } else {
        //   return ['Login failed'];
        // }
        //
        // Example 2 - Async Example
        // var promise = this.Promise()
        // YourUserModel.find({ login: login}, function (err, user) {
        //   if (err) return promise.fulfill([err]);
        //   promise.fulfill(user);
        // }
        // return promise;
    })
    .loginSuccessRedirect('/') // Where to redirect to after a login

    // If login fails, we render the errors via the login view template,
    // so just make sure your loginView() template incorporates an `errors` local.
    // See './example/views/login.jade'
    .extractExtraRegistrationParams( function (req) {
        return {
            name: req.body.name,
            password_verify: req.body.password_verify
        };
    })
    .getRegisterPath('/register') // Uri path to the registration page
    .postRegisterPath('/register') // The Uri path that your registration form POSTs to
    .registerView('register')
    .validateRegistration( function (newUserAttributes) {
        console.log("validate");
        console.log(newUserAttributes);
        // Validate the registration input
        // Return undefined, null, or [] if validation succeeds
        // Return an array of error messages (or Promise promising this array)
        // if validation fails
        //
        // e.g., assuming you define validate with the following signature
        // var errors = validate(login, password, extraParams);
        // return errors;
        //
        // The `errors` you return show up as an `errors` local in your jade template
        var promise = this.Promise();

        dao.users.checkEmail(newUserAttributes.email).next(function(result){
            if (result) {
                console.log('email exists');
                promise.fulfill(["email already exists"]);
            }
            else {
                console.log('we are cool here');
                promise.fulfill();
            }
        });

        return promise;
    })
    .registerUser( function (newUserAttributes) {
        console.log("register");
        console.log(newUserAttributes);

        var hash_password = crypto.createHash('md5').update(newUserAttributes.password).digest('hex');

        var our_user = {
            name: newUserAttributes.name,
            email: newUserAttributes.email,
            password: hash_password
        };

        var userPromise = this.Promise();
        dao.users.insert(our_user, function (error, inserted) {
            if (error) {
                userPromise.fail(error);
            } else {
                var inserted_user = inserted[0];
                userPromise.fulfill(inserted_user);
            }
        });
        return userPromise;

        // This step is only executed if we pass the validateRegistration step without
        // any errors.
        //
        // Returns a user (or a Promise that promises a user) after adding it to
        // some user store.
        //
        // As an edge case, sometimes your database may make you aware of violation
        // of the unique login index, so if this error is sent back in an async
        // callback, then you can just return that error as a single element array
        // containing just that error message, and everyauth will automatically handle
        // that as a failed registration. Again, you will have access to this error via
        // the `errors` local in your register view jade template.
        // e.g.,
        // var promise = this.Promise();
        // User.create(newUserAttributes, function (err, user) {
        //   if (err) return promise.fulfill([err]);
        //   promise.fulfill(user);
        // });
        // return promise;
        //
        // Note: Index and db-driven validations are the only validations that occur
        // here; all other validations occur in the `validateRegistration` step documented above.
    })
    .registerSuccessRedirect('/'); // Where to redirect to after a successful registration

everyauth.everymodule.userPkey('_id');
// user from session
everyauth.everymodule.findUserById( function (userId, callback) {
    dao.users.findById(userId).next(function(data){
        callback(null,data);
    });
});

// Configuration
var app = express();
// enable web server logging; pipe those log messages through winston
app.use(express.logger({stream: {
    write: function (message, encoding) {
        logger.accessLogger.info(message);
    }
}}));
app.set('port', process.env.PORT || config.port);
app.enable('trust proxy');
app.use(express.logger('dev'));
app.set('view engine', 'hjs');

//partails using by default on all pages
app.set('partials', {
//    navigation: "partials/navigation_wiki"
    footer: "partials/footer"
});

app.enable('view cache');
app.set('views', __dirname + '/views');
app.engine('hjs', require('hogan-express'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser("nothing is permitted"));
app.use(express.session(
    {
        secret: process.env.SESSION_SECRET || 'wikinextSecret438271872487',
        cookie: { domain: config.cookie_domain },
        store: mongoStore
    }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(function (req, res, next) {
    if (req.url == '/auth/facebook') {
//        console.log('auth from: ' + req.header('Referer'));
        req.session.redirectTo = req.header('Referer');
    }
    next();
});
app.use(everyauth.middleware());
app.use(app.router);

//everyauth.helpExpress(app);

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});

app.locals({
    site: {
        title: 'WikiNEXT',
        description: 'Semantic Application Wiki Engine'
    },
    author: {
        name: 'Pavel Arapov',
        contact: 'pavel.arapov@gmail.com'
    },
    isDev: false
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
app.get('/user/:id', routes.user);

app.post('/check_email', routes.check_email);

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
app.post('/wiki/:id/save', routes.save);
// schema.org api
app.post('/schema', routes.schema);

app.get('/wiki/:id/edit',routes.edit);
//app.get('/wiki/:id/app',routes.app);
app.post('/wiki/:id/save',routes.save);
app.post('/upload',routes.upload);
app.post('/deleteattach',routes.deleteattach);
app.post('/attachlibrary',routes.attach_library);
app.post('/update_cache',routes.update_cache);
app.post('/change_parent',routes.updateParent);
// tree
app.get('/links',routes.loadPagesTree);

app.get('/redirect', function(req,res){
    var session = req.session;
    if (session.redirectTo) {
        var redirectTo = session.redirectTo;
        delete session.redirectTo;
    } else
        redirectTo = "/";
    res.redirect(redirectTo);
});

http.createServer(app).listen(app.get('port'), process.env.IP ||"0.0.0.0", function () {
    logger.accessLogger.info('Express server listening on port ' + app.get('port'));
});


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

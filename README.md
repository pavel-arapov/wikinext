WikiNEXT
========

## WikiNEXT - JavaScript Semantic Application Wiki

Wiki have 2 node.js apps
- app.js (main wiki application)
- share.js (Share.JS library that give the possibility to edit the pages in real-time due to OT 

## How to run

npm install 

Wiki uses config.settings file, it must be in root with syntax below
config = {
    port : 8000,
    port_sharejs : 8001,
    host_uri : "http://localhost:8000",
    host_sync_uri: "http://localhost:8001",
    mongo_uri : 'mongodb://localhost:27017/wikinext',
    logger_file: "wikinext.debug.log",
    cookie_domain : '',

    FACEBOOK : {
        APP_ID : '123424751113889',
        SECRET : '3e6c2e988523337dfa501e661f553e89'
    }
};

The FB app's key below from mine application, you can use them to test localy, but you need to create your own fb application if you want to use wiki with other domain name.
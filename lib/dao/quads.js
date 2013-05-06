//**********************
// Working with quads
//**********************
var Deferred = require('jsdeferred').Deferred;

module.exports = function(db){
    return {
        findById:function (id, callback) {
            //console.log(id);
            db.collection('quads').findOne({_id:db.ObjectID(id)}, function (error, result) {
                if (error) callback(error);
                else
                    callback(null, result)
            });
        },
        saveAll:function (quads, callback) {
            if (typeof(quads.length) == "undefined")
                quads = [quads];

            db.collection('quads').insert(quads, function () {
                callback(null, quads);
            });
        },
        findAll:function () {
            var d = Deferred();
            db.collection('quads').find().toArray(function (error, results) {
                if (error)
                    d.error(error);
                else
                    d.call(results);
            });
            return d;
        },
        findByParams: function (query,fields) {
            var d = Deferred();
            db.collection('quads').find(query, fields).toArray(function(error, results){
                if (error)
                    d.error(error);
                else
                    d.call(results);
            });
            return d;
        },
        distinct: function(field, query) {
            var d = Deferred();
            db.collection('quads').distinct(field, query,function(error, results){
                if (error)
                    d.error(error);
                else
                    d.call(results);
            });
            return d;
        },
        insert:function (data, callback) {
            db.collection('quads').insert(data, function (error, results) {
                    if (error) callback(error);
                    else callback(null, results)
                }
            );
        },
        update:function (data, callback) {
            var _id = db.ObjectID(data._id);
            delete(data._id);
            db.collection('quads').update(
                {"_id":_id}, // query
                {$set:data}, // replace
                {safe:true},
                function (error, object) {
                    if (error)
                        callback(error.message);
                    else {
                    }
                    callback(null, object);
                }
            );
        }
    }
};
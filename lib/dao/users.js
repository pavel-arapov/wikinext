//**********************
// Working with users
//**********************
var Deferred = require('jsdeferred').Deferred;

module.exports = function(db){
    return {
        //    getCollection:function (db, callback) {
//        //console.log("==> Get Collection Users");
//        db.collection('users', function (error, users_collection) {
//            if (error) callback(error);
//            else callback(null, users_collection);
//        });
//    },
        findById:function (id, callback) {
            //console.log(id);
            db.collection('users').findOne({_id:db.ObjectID(id)}, function (error, result) {
                if (error) callback(error);
                else
                    callback(null, result)
            });
        },
        findByFBId:function (id, callback) {
            db.collection('users').findOne({'fbid':id}, function (error, result) {
                if (error) callback(error);
                else
                    callback(null, result)
            });
        },
        saveAll:function (users, callback) {
            if (typeof(users.length) == "undefined")
                users = [users];

            db.collection('users').insert(users, function () {
                callback(null, users);
            });
        },
        findAll:function () {
            var d = Deferred();
            db.collection('users').find().toArray(function (error, results) {
                if (error)
                    d.error(error);
                else
                    d.call(results);
            });
            return d;
        },
        insert:function (data, callback) {
            db.collection('users').insert(data, function (error, results) {
                    if (error) callback(error);
                    else callback(null, results)
                }
            );
        },
        update:function (data, callback) {
            var _id = db.ObjectID(data._id);
            delete(data._id);
            db.collection('users').update(
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
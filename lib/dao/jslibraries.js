//**********************
// Working with jslibraries
//**********************
var Deferred = require('jsdeferred').Deferred;
var _ = require('underscore');

module.exports = function(db){
    return {
        /**
         * Finding a library by ID
         * @param id
         * @return {Deferred}
         */
        findById:function (id) {
            var d = new Deferred();
            db.collection('jslibraries').findOne({_id:db.ObjectID(id)}, function (error, result) {
                if (error)
                    d.fail(error);
                else
                    d.call(result)
            });
            return d;
        },
        findByIdLimited:function (id,limited) {
            var d = new Deferred();
            db.collection('jslibraries').findOne({_id:db.ObjectID(id)},limited, function (error, result) {
                if (error)
                    d.fail(error);
                else
                    d.call(result)
            });
            return d;
        },
        findAll:function () {
            var d = new Deferred();
            db.collection('jslibraries').find().toArray(function (error, results) {
                if (error)
                    d.fail(error);
                else
                    d.call(results)
            });
            return d;
        },
        findAllByUserId:function (id) {
            var d = new Deferred();
            id = db.ObjectID(id);
            db.collection('jslibraries').find({'author.$id':id}).toArray(function (error, results) {
                if (error)
                    d.fail(error);
                else
                    d.call(results)
            });
            return d;
        },
        insert:function (data, callback) {
            data.created_at = new Date();
            data.author = new db.db.bson_serializer.DBRef('users',db.ObjectID(data.userid.toString()),null);
            if (!_.isUndefined(data.parent))
                data.parent = new db.db.bson_serializer.DBRef('jslibraries',db.ObjectID(data.parent.toString()),null);
            db.collection('jslibraries').insert(data, function (error, result) {
                    if (error) callback(error);
                    else callback(null, result)
                }
            );
        },
        update:function (data, callback) {
            var _id = db.ObjectID(data._id);
            delete(data._id);
            db.collection('jslibraries').update(
                {"_id":_id}, // query
                {$set:data}, // replace
                {safe:true},
                function (error, object) {
                    if (error)
                        callback(error.message);
                    callback(null, record);
                }
            );

        },
        delete:function(id,callback) {
            var id = db.ObjectID(id);
            db.collection('jslibraries').removeById(id,
            function(error) {
                if (error)
                    callback(error.message);
            });
        }
    };
};
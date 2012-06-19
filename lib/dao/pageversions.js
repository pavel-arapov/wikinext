//**********************
// Working with page's versions
//**********************
var Deferred = require('jsdeferred').Deferred;

module.exports = function(db){
    return {
        findById:function (id) {
            var d = new Deferred();
            db.collection('pageversions').findOne({_id:db.ObjectID(id)}, function (error, result) {
                if (error)
                    d.fail(error);
                else
                    d.call(result)
            });
            return d;
        },
        findAll:function (callback) {
            var d = new Deferred();
            db.collection('pageversions').find().toArray(function (error, results) {
                if (error)
                    d.fail(error);
                else
                    d.call(results)
            });
            return d;
        },
        findAllByUserId:function (id, callback) {
            id = db.ObjectID(id);
            //id = db.db.bson_serializer.ObjectID.createFromHexString(id);
            db.collection('pageversions').find({'author.$id':id}).toArray(function (error, results) {
                if (error) callback(error);
                else callback(null, results)
            });
        },
        findAllLinks:function (callback) {
            db.collection('pageversions').find({}, {'_id':1, 'name':1}).toArray(function (error, results) {
                if (error) callback(error);
                else callback(null, results)
            });
        },
        insert:function (pageid, userid, data, callback) {
            data.author = new db.db.bson_serializer.DBRef('users',db.ObjectID(userid.toString()),null);
            data.page = new db.db.bson_serializer.DBRef('pages',db.ObjectID(pageid.toString()),null);
            //data.parent = new db.db.bson_serializer.DBRef('pageversions',db.ObjectID(data.parent+""),null);
            db.collection('pageversions').insert(data, function (error, result) {
                    if (error) callback(error);
                    else callback(null, result)
                }
            );
        },
        update:function (data, callback) {
            if (data.parent != undefined){
                data.parent = new db.db.bson_serializer.DBRef('pageversions',data.parent);
            }
            var _id = db.ObjectID(data._id);
            delete(data._id);
            db.collection('pageversions').update(
                {"_id":_id}, // query
                {$set:data}, // replace
                {safe:true},
                function (error, object) {
                    if (error)
                        callback(error.message);
                    else {
                        if (data.title != undefined) var title = data.title;
                        else title = object.title;
                        if (data.article != undefined) var article = data.article;
                        else article = object.article;
                        var record = {_id:_id, title:title, article:article};
                    }
                    callback(null, record);
                }
            );

        }
    };
};
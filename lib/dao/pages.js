//**********************
// Working with pages
//**********************
var Deferred = require('jsdeferred').Deferred;

module.exports = function(db){
    return {
        findById:function (id) {
            var d = new Deferred();
            db.collection('pages').findOne({_id:db.ObjectID(id)}, function (error, result) {
                if (error)
                    d.fail(error);
                else
                    d.call(result)
            });
            return d;
        },
        //not used
        saveAll:function (pages, callback) {
            if (typeof(pages.length) == "undefined")
                pages = [pages];

            for (var i = 0; i < pages.length; i++) {
                var article = pages[i];
                article.created_at = new Date();
                if (article.comments === undefined) article.comments = [];
                for (var j = 0; j < article.comments.length; j++) {
                    article.comments[j].created_at = new Date();
                }
            }

            db.collection('pages').insert(pages, function () {
                callback(null, articles);
            });
        },
        findAll:function (callback) {
            var d = new Deferred();
            db.collection('pages').find().toArray(function (error, results) {
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
            db.collection('pages').find({'author.$id':id}).toArray(function (error, results) {
                if (error) callback(error);
                else callback(null, results)
            });
        },
        findAllLinks:function (callback) {
            db.collection('pages').find({}, {'_id':1, 'name':1}).toArray(function (error, results) {
                if (error) callback(error);
                else callback(null, results)
            });
        },
        insert:function (data, callback) {
            data.created_at = new Date();
            //data.userid = db.db.bson_serializer.ObjectID.createFromHexString(data.userid);
            data.author = new db.db.bson_serializer.DBRef('users',db.ObjectID(data.userid.toString()),null);
            //data.parent = db.db.bson_serializer.ObjectID.createFromHexString(data.parent);
            //data.parent = new db.db.bson_serializer.DBRef('pages',db.ObjectID(data.parent+""),null);
            db.collection('pages').insert(data, function (error, result) {
                    if (error) callback(error);
                    else callback(null, result)
                }
            );
        },
        update:function (data, callback) {
            if (data.parent != undefined){
                data.parent = new db.db.bson_serializer.DBRef('pages',data.parent);
            }
            var _id = db.ObjectID(data._id);
            delete(data._id);
            db.collection('pages').update(
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

        },
        attachImage:function (id, data, callback){
            var _id = db.ObjectID(id);
            db.collection('pages').update(
                {"_id":_id}, // query
                {$push:{"attach":data}}, // pust to attach
                {safe:true},
                function (error, object) {
                    if (error)
                        callback(error.message);
                    else {
                        if (data.title != undefined) var title = data.title;
                        else title = object.title;
                        if (data.article != undefined) var article = data.article;
                        else article = object.article;
                        var record = {_id:_id, title:title, article:article, parent:data.parent};
                    }
                    callback(null, record);
                }
            );
        }
    };
};
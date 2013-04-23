//**********************
// Working with meta data
//**********************
var Deferred = require('jsdeferred').Deferred;
var _ = require('underscore');

module.exports = function (db) {
    return {
        findById: function (id) {
            var d = new Deferred();
            db.collection('meta').findOne({_id: db.ObjectID(id)}, function (error, result) {
                if (error)
                    d.fail(error);
                else
                    d.call(result)
            });
            return d;
        },
        findByIdLimited: function (id, limited) {
            var d = new Deferred();
            db.collection('meta').findOne({_id: db.ObjectID(id)}, limited, function (error, result) {
                if (error)
                    d.fail(error);
                else
                    d.call(result)
            });
            return d;
        },
        findAll: function () {
            var d = new Deferred();
            db.collection('meta').find().toArray(function (error, results) {
                if (error)
                    d.fail(error);
                else
                    d.call(results)
            });
            return d;
        },
        insert: function (data) {
            var d = Deferred();
            db.collection('meta').insert(data, function (error, result) {
                    if (error)
                        d.fail(error);
                    else
                        d.call(result);
                }
            );
            return d;
        },
        update: function (data, callback) {
            var _id = db.ObjectID(data._id);
            delete(data._id);
            db.collection('meta').update(
                {"_id": _id}, // query
                {$set: data}, //replace
                {safe: true},
                function (error, object) {
                    if (error)
                        callback(error.message);
                    else {
                        if (data.title != undefined) var title = data.title;
                        else title = object.title;
                        if (data.article != undefined) var article = data.article;
                        else article = object.article;
                        var record = {_id: _id, title: title, article: article};
                    }
                    callback(null, record);
                }
            );

        },
        /**
         * Remove a triple
         * @param id        triple's id
         * @param callback
         */
        remove: function (id, callback) {
            var _id = db.ObjectID(id);
            db.collection('meta').removeById(_id,
                function (error) {
                    if (error)
                        callback(error.message);
                    else
                        callback();
                });
        },
        /**
         * Removing all triples which are defined by page
         * @param pageid    page's id
         * @returns {*}
         */
        removeAllForPage: function (pageid) {
            var d = Deferred();
            var pageid = db.ObjectID(id);
            db.collection('meta').remove({pageid: pageid},{},function(error, result) {
                if (error)
                    d.fail(error);
                else
                    d.call(result);
            });
            return d;
        }
    };
};
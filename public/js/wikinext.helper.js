var wikinextHelper = (function () {
    var countLoading = 0;

    function loaderCount(count) {
        countLoading += count;
        if (countLoading > 0) {
            console.log("loading...");
        } else {
            console.log("load completed");
        }
    }

    var relations = {
        "http://www.w3.org/2000/01/rdf-schema#label" : "schema_label",
        "http://www.w3.org/2002/07/owl#sameAs" : "schema_label",
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" : "ns_type",
        "http://www.w3.org/2000/01/rdf-schema#comment " : "schema_comment"
    }

    var rdftypes = {
        "uri" : "ns_type",
        "literal" : "schema_label"
    };

    return {
        init:function () {
            var d = new Deferred();
            var self = this;
            Deferred.parallel({
                // base templates
                messageSuccess:this.http_get("/templates/messageSuccess.html"),
                messageFail:this.http_get("/templates/messageFail.html"),
                // rdf onfly templates
                ns_type:this.http_get("/templates/rdftypes/ns_type.html"),
                owl_sameas:this.http_get("/templates/rdftypes/owl_sameas.html"),
                schema_label:this.http_get("/templates/rdftypes/schema_label.html"),
                schema_comment:this.http_get("/templates/rdftypes/schema_label.html")
            }).next(function (data) {
                    ich.addTemplate("messageSuccess", data.messageSuccess);
                    ich.addTemplate("messageFail", data.messageFail);

                    ich.addTemplate("schema_label",data.schema_label);
                    ich.addTemplate("owl_sameas",data.owl_sameas);
                    ich.addTemplate("ns_type",data.ns_type);
                    ich.addTemplate("schema_comment",data.schema_comment);

                    console.log("templates loaded");
                });
            return d;
        },
        http_get:function (url) {
            loaderCount(1);
            var d = new Deferred();
            $.get(url, function (response) {
                loaderCount(-1);
                d.call(response);
            });
            return d;
        },
        http_post:function (url, params) {
            loaderCount(1);
            var d = new Deferred();
            $.post(url, params, function (response) {
                loaderCount(-1);
                d.call(response);
            });
            return d;
        },
        timeFormat:function (millisecs) {
            var secs = Math.floor(millisecs / 1000);
            var hr = Math.floor(secs / 3600);
            var min = Math.floor((secs - (hr * 3600)) / 60);
            var sec = Math.floor(secs - (hr * 3600) - (min * 60));

            if (hr < 10) {
                hr = "0" + hr;
            }
            if (min < 10) {
                min = "0" + min;
            }
            if (sec < 10) {
                sec = "0" + sec;
            }
            return hr + ':' + min + ':' + sec;
        },
        sparqlOnFly:function (result) {
            var html = jQuery('<div></div>');
            var a;
            // {head, results}

            // variables used in query
            var vars = result.head.vars;

            _.each(result.results.bindings, function(value){
                // value = var { type, value }
                var found_value = value;
                _.each(vars, function (name) {
                    var template = ich.templates[rdftypes[found_value[name].type]];
                    if (typeof template != 'undefined'){
                         a = ich[rdftypes[found_value[name].type]](found_value[name]);
                    }
                    else
                         a = ich.ns_type(found_value[name]);
                    $(html).append(a);
                })
            });
            return html;
        }
    }
})();
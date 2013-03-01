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

    // encode an input string into either numerical or HTML entities
    function htmlEncode(s,dbl){

        if(this.isEmpty(s)) return "";

        // do we allow double encoding? E.g will &amp; be turned into &amp;amp;
        dbl = dbl || false; //default to prevent double encoding

        // if allowing double encoding we do ampersands first
        if(dbl){
            if(this.EncodeType=="numerical"){
                s = s.replace(/&/g, "&#38;");
            }else{
                s = s.replace(/&/g, "&amp;");
            }
        }

        // convert the xss chars to numerical entities ' " < >
        s = this.XSSEncode(s,false);

        if(this.EncodeType=="numerical" || !dbl){
            // Now call function that will convert any HTML entities to numerical codes
            s = this.HTML2Numerical(s);
        }

        // Now encode all chars above 127 e.g unicode
        s = this.numEncode(s);

        // now we know anything that needs to be encoded has been converted to numerical entities we
        // can encode any ampersands & that are not part of encoded entities
        // to handle the fact that I need to do a negative check and handle multiple ampersands &&&
        // I am going to use a placeholder

        // if we don't want double encoded entities we ignore the & in existing entities
        if(!dbl){
            s = s.replace(/&#/g,"##AMPHASH##");

            if(this.EncodeType=="numerical"){
                s = s.replace(/&/g, "&#38;");
            }else{
                s = s.replace(/&/g, "&amp;");
            }

            s = s.replace(/##AMPHASH##/g,"&#");
        }

        // replace any malformed entities
        s = s.replace(/&#\d*([^\d;]|$)/g, "$1");

        if(!dbl){
            // safety check to correct any double encoded &amp;
            s = this.correctEncoding(s);
        }

        // now do we need to convert our numerical encoded string into entities
        if(this.EncodeType=="entity"){
            s = this.NumericalToHTML(s);
        }

        return s;
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
        /**
         * Nice for time/date from milliseconds
         * @param millisecs milliseconds - timestamp
         * @return {string} understandable format of time
         */
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
        /**
         * Create HTML output for SPARQL JSON Result
         * @param result
         * @return {*}
         */
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
        },
        /**
         * Macro to create content table based on Headers
         */
        updateContent: function () {
            // looking for data-wikinext to create a place for content table
            $("#article_show").find('[data-wikinext]').each(function () {
                var dom_element = this;
                //all items for macros replace/content augmentation
                //content (find all headers and construct anchors before them and list with links to it
                var ul = null;
                var lasth1 = null;
                var lasth1ul = null;
                var lasth2 = null;
                var lasth2ul = null;
                $("#article_show").find("h1, h2, h3").each(function () {

                    switch (this.tagName.toLowerCase()) {
                        case "h1":
                            if (!ul) {
                                ul = $("<ul>");
                            }
                            lasth1 = $("<li>").html($(this).html()).appendTo(ul);
                            break;
                        case "h2":
                            if (!lasth1) {
                                // Deal with invalid condition, h2 with no h1 before it
                            }
                            else {
                                if (!lasth1ul) {
                                    lasth1ul = $("<ul>").appendTo(lasth1);
                                }
                                lasth2 = $("<li>").html($(this).html()).appendTo(lasth1ul);
                            }
                            break;
                        case "h3":
                            if (!lasth2) {
                                // Deal with invalid condition, h3 with no h2 before it
                            }
                            else {
                                if (!lasth2ul) {
                                    lasth2ul = $("<ul>").appendTo(lasth2);
                                }
                                $("<li>").html($(this).html()).appendTo(lasth2ul);
                            }
                            break;
                    }

                });
                if (ul) {
                    $(dom_element).append(ul);
                }
            });
        },
        preparePrettify: function (article) {
            $(article).find(".prettyprint").each(function() {
                $(this).text(htmlEncode($(this).html()));
            })

        },
        /**
         * Saving SPARQL JSON result to a page cache system
         * @param pageid    id of a page
         * @param name      query name
         * @param result    result
         */
        saveToCache: function (pageid, name, result) {
            this.http_post("/update_cache",{
                pageid: pageid,
                name: name,
                result: result
            }).next(function(data){
                    console.log(data);
                })
        },
        /**
         * Loading page's cache
         * @param pageid
         */
        loadCache : function (pageid) {
            var d = Deferred();
            this.http_post("/load_cache", {
                pageid: pageid
            }).next(function(cache){
                    d.call(cache);
                });
            return d;
        },
        /**
         * API REST create page
         * @param title Title of a page
         */
        createPage: function (title) {
            this.http_post("/create", {
                page_name: title
            })
        }
    }
})();
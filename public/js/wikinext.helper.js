var wikinextHelper = (function () {
    var countLoading = 0;

    var selectDialogCallback = function(data) {};

    function loaderCount(count) {
        countLoading += count;
        if (countLoading > 0) {
            console.log("loading...");
        } else {
            console.log("load completed");
        }
    }

    var htmlEncoder = {
        // When encoding do we convert characters into html or numerical entities
        EncodeType: "entity",  // entity OR numerical

        isEmpty: function (val) {
            if (val) {
                return ((val === null) || val.length == 0 || /^\s+$/.test(val));
            } else {
                return true;
            }
        },

        // arrays for conversion from HTML Entities to Numerical values
        arr1: ['&nbsp;', '&iexcl;', '&cent;', '&pound;', '&curren;', '&yen;', '&brvbar;', '&sect;', '&uml;', '&copy;', '&ordf;', '&laquo;', '&not;', '&shy;', '&reg;', '&macr;', '&deg;', '&plusmn;', '&sup2;', '&sup3;', '&acute;', '&micro;', '&para;', '&middot;', '&cedil;', '&sup1;', '&ordm;', '&raquo;', '&frac14;', '&frac12;', '&frac34;', '&iquest;', '&Agrave;', '&Aacute;', '&Acirc;', '&Atilde;', '&Auml;', '&Aring;', '&AElig;', '&Ccedil;', '&Egrave;', '&Eacute;', '&Ecirc;', '&Euml;', '&Igrave;', '&Iacute;', '&Icirc;', '&Iuml;', '&ETH;', '&Ntilde;', '&Ograve;', '&Oacute;', '&Ocirc;', '&Otilde;', '&Ouml;', '&times;', '&Oslash;', '&Ugrave;', '&Uacute;', '&Ucirc;', '&Uuml;', '&Yacute;', '&THORN;', '&szlig;', '&agrave;', '&aacute;', '&acirc;', '&atilde;', '&auml;', '&aring;', '&aelig;', '&ccedil;', '&egrave;', '&eacute;', '&ecirc;', '&euml;', '&igrave;', '&iacute;', '&icirc;', '&iuml;', '&eth;', '&ntilde;', '&ograve;', '&oacute;', '&ocirc;', '&otilde;', '&ouml;', '&divide;', '&oslash;', '&ugrave;', '&uacute;', '&ucirc;', '&uuml;', '&yacute;', '&thorn;', '&yuml;', '&quot;', '&amp;', '&lt;', '&gt;', '&OElig;', '&oelig;', '&Scaron;', '&scaron;', '&Yuml;', '&circ;', '&tilde;', '&ensp;', '&emsp;', '&thinsp;', '&zwnj;', '&zwj;', '&lrm;', '&rlm;', '&ndash;', '&mdash;', '&lsquo;', '&rsquo;', '&sbquo;', '&ldquo;', '&rdquo;', '&bdquo;', '&dagger;', '&Dagger;', '&permil;', '&lsaquo;', '&rsaquo;', '&euro;', '&fnof;', '&Alpha;', '&Beta;', '&Gamma;', '&Delta;', '&Epsilon;', '&Zeta;', '&Eta;', '&Theta;', '&Iota;', '&Kappa;', '&Lambda;', '&Mu;', '&Nu;', '&Xi;', '&Omicron;', '&Pi;', '&Rho;', '&Sigma;', '&Tau;', '&Upsilon;', '&Phi;', '&Chi;', '&Psi;', '&Omega;', '&alpha;', '&beta;', '&gamma;', '&delta;', '&epsilon;', '&zeta;', '&eta;', '&theta;', '&iota;', '&kappa;', '&lambda;', '&mu;', '&nu;', '&xi;', '&omicron;', '&pi;', '&rho;', '&sigmaf;', '&sigma;', '&tau;', '&upsilon;', '&phi;', '&chi;', '&psi;', '&omega;', '&thetasym;', '&upsih;', '&piv;', '&bull;', '&hellip;', '&prime;', '&Prime;', '&oline;', '&frasl;', '&weierp;', '&image;', '&real;', '&trade;', '&alefsym;', '&larr;', '&uarr;', '&rarr;', '&darr;', '&harr;', '&crarr;', '&lArr;', '&uArr;', '&rArr;', '&dArr;', '&hArr;', '&forall;', '&part;', '&exist;', '&empty;', '&nabla;', '&isin;', '&notin;', '&ni;', '&prod;', '&sum;', '&minus;', '&lowast;', '&radic;', '&prop;', '&infin;', '&ang;', '&and;', '&or;', '&cap;', '&cup;', '&int;', '&there4;', '&sim;', '&cong;', '&asymp;', '&ne;', '&equiv;', '&le;', '&ge;', '&sub;', '&sup;', '&nsub;', '&sube;', '&supe;', '&oplus;', '&otimes;', '&perp;', '&sdot;', '&lceil;', '&rceil;', '&lfloor;', '&rfloor;', '&lang;', '&rang;', '&loz;', '&spades;', '&clubs;', '&hearts;', '&diams;'],
        arr2: ['&#160;', '&#161;', '&#162;', '&#163;', '&#164;', '&#165;', '&#166;', '&#167;', '&#168;', '&#169;', '&#170;', '&#171;', '&#172;', '&#173;', '&#174;', '&#175;', '&#176;', '&#177;', '&#178;', '&#179;', '&#180;', '&#181;', '&#182;', '&#183;', '&#184;', '&#185;', '&#186;', '&#187;', '&#188;', '&#189;', '&#190;', '&#191;', '&#192;', '&#193;', '&#194;', '&#195;', '&#196;', '&#197;', '&#198;', '&#199;', '&#200;', '&#201;', '&#202;', '&#203;', '&#204;', '&#205;', '&#206;', '&#207;', '&#208;', '&#209;', '&#210;', '&#211;', '&#212;', '&#213;', '&#214;', '&#215;', '&#216;', '&#217;', '&#218;', '&#219;', '&#220;', '&#221;', '&#222;', '&#223;', '&#224;', '&#225;', '&#226;', '&#227;', '&#228;', '&#229;', '&#230;', '&#231;', '&#232;', '&#233;', '&#234;', '&#235;', '&#236;', '&#237;', '&#238;', '&#239;', '&#240;', '&#241;', '&#242;', '&#243;', '&#244;', '&#245;', '&#246;', '&#247;', '&#248;', '&#249;', '&#250;', '&#251;', '&#252;', '&#253;', '&#254;', '&#255;', '&#34;', '&#38;', '&#60;', '&#62;', '&#338;', '&#339;', '&#352;', '&#353;', '&#376;', '&#710;', '&#732;', '&#8194;', '&#8195;', '&#8201;', '&#8204;', '&#8205;', '&#8206;', '&#8207;', '&#8211;', '&#8212;', '&#8216;', '&#8217;', '&#8218;', '&#8220;', '&#8221;', '&#8222;', '&#8224;', '&#8225;', '&#8240;', '&#8249;', '&#8250;', '&#8364;', '&#402;', '&#913;', '&#914;', '&#915;', '&#916;', '&#917;', '&#918;', '&#919;', '&#920;', '&#921;', '&#922;', '&#923;', '&#924;', '&#925;', '&#926;', '&#927;', '&#928;', '&#929;', '&#931;', '&#932;', '&#933;', '&#934;', '&#935;', '&#936;', '&#937;', '&#945;', '&#946;', '&#947;', '&#948;', '&#949;', '&#950;', '&#951;', '&#952;', '&#953;', '&#954;', '&#955;', '&#956;', '&#957;', '&#958;', '&#959;', '&#960;', '&#961;', '&#962;', '&#963;', '&#964;', '&#965;', '&#966;', '&#967;', '&#968;', '&#969;', '&#977;', '&#978;', '&#982;', '&#8226;', '&#8230;', '&#8242;', '&#8243;', '&#8254;', '&#8260;', '&#8472;', '&#8465;', '&#8476;', '&#8482;', '&#8501;', '&#8592;', '&#8593;', '&#8594;', '&#8595;', '&#8596;', '&#8629;', '&#8656;', '&#8657;', '&#8658;', '&#8659;', '&#8660;', '&#8704;', '&#8706;', '&#8707;', '&#8709;', '&#8711;', '&#8712;', '&#8713;', '&#8715;', '&#8719;', '&#8721;', '&#8722;', '&#8727;', '&#8730;', '&#8733;', '&#8734;', '&#8736;', '&#8743;', '&#8744;', '&#8745;', '&#8746;', '&#8747;', '&#8756;', '&#8764;', '&#8773;', '&#8776;', '&#8800;', '&#8801;', '&#8804;', '&#8805;', '&#8834;', '&#8835;', '&#8836;', '&#8838;', '&#8839;', '&#8853;', '&#8855;', '&#8869;', '&#8901;', '&#8968;', '&#8969;', '&#8970;', '&#8971;', '&#9001;', '&#9002;', '&#9674;', '&#9824;', '&#9827;', '&#9829;', '&#9830;'],

        // Convert HTML entities into numerical entities
        HTML2Numerical: function (s) {
            return this.swapArrayVals(s, this.arr1, this.arr2);
        },

        // Convert Numerical entities into HTML entities
        NumericalToHTML: function (s) {
            return this.swapArrayVals(s, this.arr2, this.arr1);
        },


        // Numerically encodes all unicode characters
        numEncode: function (s) {

            if (this.isEmpty(s)) return "";

            var e = "";
            for (var i = 0; i < s.length; i++) {
                var c = s.charAt(i);
                if (c < " " || c > "~") {
                    c = "&#" + c.charCodeAt() + ";";
                }
                e += c;
            }
            return e;
        },

        // HTML Decode numerical and HTML entities back to original values
        htmlDecode: function (s) {

            var c, m, d = s;

            if (this.isEmpty(d)) return "";

            // convert HTML entites back to numerical entites first
            d = this.HTML2Numerical(d);

            // look for numerical entities &#34;
            arr = d.match(/&#[0-9]{1,5};/g);

            // if no matches found in string then skip
            if (arr != null) {
                for (var x = 0; x < arr.length; x++) {
                    m = arr[x];
                    c = m.substring(2, m.length - 1); //get numeric part which is refernce to unicode character
                    // if its a valid number we can decode
                    if (c >= -32768 && c <= 65535) {
                        // decode every single match within string
                        d = d.replace(m, String.fromCharCode(c));
                    } else {
                        d = d.replace(m, ""); //invalid so replace with nada
                    }
                }
            }

            return d;
        },

        // encode an input string into either numerical or HTML entities
        htmlEncode: function (s, dbl) {

            if (this.isEmpty(s)) return "";

            // do we allow double encoding? E.g will &amp; be turned into &amp;amp;
            dbl = dbl || false; //default to prevent double encoding

            // if allowing double encoding we do ampersands first
            if (dbl) {
                if (this.EncodeType == "numerical") {
                    s = s.replace(/&/g, "&#38;");
                } else {
                    s = s.replace(/&/g, "&amp;");
                }
            }

            // convert the xss chars to numerical entities ' " < >
            s = this.XSSEncode(s, false);

            if (this.EncodeType == "numerical" || !dbl) {
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
            if (!dbl) {
                s = s.replace(/&#/g, "##AMPHASH##");

                if (this.EncodeType == "numerical") {
                    s = s.replace(/&/g, "&#38;");
                } else {
                    s = s.replace(/&/g, "&amp;");
                }

                s = s.replace(/##AMPHASH##/g, "&#");
            }

            // replace any malformed entities
            s = s.replace(/&#\d*([^\d;]|$)/g, "$1");

            if (!dbl) {
                // safety check to correct any double encoded &amp;
                s = this.correctEncoding(s);
            }

            // now do we need to convert our numerical encoded string into entities
            if (this.EncodeType == "entity") {
                s = this.NumericalToHTML(s);
            }

            return s;
        },

        // Encodes the basic 4 characters used to malform HTML in XSS hacks
        XSSEncode: function (s, en) {
            if (!this.isEmpty(s)) {
                en = en || true;
                // do we convert to numerical or html entity?
                if (en) {
                    s = s.replace(/\'/g, "&#39;"); //no HTML equivalent as &apos is not cross browser supported
                    s = s.replace(/\"/g, "&quot;");
                    s = s.replace(/</g, "&lt;");
                    s = s.replace(/>/g, "&gt;");
                } else {
                    s = s.replace(/\'/g, "&#39;"); //no HTML equivalent as &apos is not cross browser supported
                    s = s.replace(/\"/g, "&#34;");
                    s = s.replace(/</g, "&#60;");
                    s = s.replace(/>/g, "&#62;");
                }
                return s;
            } else {
                return "";
            }
        },

        // returns true if a string contains html or numerical encoded entities
        hasEncoded: function (s) {
            if (/&#[0-9]{1,5};/g.test(s)) {
                return true;
            } else if (/&[A-Z]{2,6};/gi.test(s)) {
                return true;
            } else {
                return false;
            }
        },

        // will remove any unicode characters
        stripUnicode: function (s) {
            return s.replace(/[^\x20-\x7E]/g, "");

        },

        // corrects any double encoded &amp; entities e.g &amp;amp;
        correctEncoding: function (s) {
            return s.replace(/(&amp;)(amp;)+/, "$1");
        },


        // Function to loop through an array swaping each item with the value from another array e.g swap HTML entities with Numericals
        swapArrayVals: function (s, arr1, arr2) {
            if (this.isEmpty(s)) return "";
            var re;
            if (arr1 && arr2) {
                //ShowDebug("in swapArrayVals arr1.length = " + arr1.length + " arr2.length = " + arr2.length)
                // array lengths must match
                if (arr1.length == arr2.length) {
                    for (var x = 0, i = arr1.length; x < i; x++) {
                        re = new RegExp(arr1[x], 'g');
                        s = s.replace(re, arr2[x]); //swap arr1 item with matching item from arr2
                    }
                }
            }
            return s;
        },

        inArray: function (item, arr) {
            for (var i = 0, x = arr.length; i < x; i++) {
                if (arr[i] === item) {
                    return i;
                }
            }
            return -1;
        },

        nl2br: function (str) {	// Inserts HTML line breaks before all newlines in a string
            return str.replace(/([^>])\n/g, '$1<br/>');
        }
    };

    var relations = {
        "http://www.w3.org/2000/01/rdf-schema#label": "schema_label",
        "http://www.w3.org/2002/07/owl#sameAs": "schema_label",
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": "ns_type",
        "http://www.w3.org/2000/01/rdf-schema#comment ": "schema_comment"
    };

    var rdftypes = {
        "uri": "ns_type",
        "literal": "schema_label",
        "typed-literal" : "schema_label"
    };

    function checkExtention(sFileName) {
        var _validFileExtensions = [".jpg", ".jpeg", ".bmp", ".gif", ".png"];
        var blnValid = false;
        for (var j = 0; j < _validFileExtensions.length; j++) {
            var sCurExtension = _validFileExtensions[j];
            if (sFileName.substr(sFileName.length - sCurExtension.length, sCurExtension.length).toLowerCase() == sCurExtension.toLowerCase()) {
                blnValid = true;
                break;
            }
        }
        return blnValid;
    }

    return {
        init: function () {
            var d = new Deferred();
            var self = this;
            Deferred.parallel({
                // base templates
                messageSuccess: this.http_get("/templates/messageSuccess.html"),
                messageFail: this.http_get("/templates/messageFail.html"),
                // rdf onfly templates
                ns_type: this.http_get("/templates/rdftypes/ns_type.html"),
                owl_sameas: this.http_get("/templates/rdftypes/owl_sameas.html"),
                schema_label: this.http_get("/templates/rdftypes/schema_label.html"),
                schema_comment: this.http_get("/templates/rdftypes/schema_label.html"),
                image_show: this.http_get("/templates/rdftypes/image_show.html"),
                // treeview templates
                treeview: this.http_get("/templates/treeview.html"),
                treeview_folder: this.http_get("/templates/treeview_folder.html")
            }).next(function (data) {
                    ich.addTemplate("messageSuccess", data.messageSuccess);
                    ich.addTemplate("messageFail", data.messageFail);

                    ich.addTemplate("schema_label", data.schema_label);
                    ich.addTemplate("owl_sameas", data.owl_sameas);
                    ich.addTemplate("ns_type", data.ns_type);
                    ich.addTemplate("schema_comment", data.schema_comment);
                    ich.addTemplate("image_show", data.image_show);

                    ich.addTemplate("treeview", data.treeview);
                    ich.addTemplate("treeview_folder", data.treeview_folder);

                    console.log("templates loaded");
                    self.constructTreeView();
                    d.call();
                });
            return d;
        },
        http_get: function (url) {
            loaderCount(1);
            var d = new Deferred();
            $.get(url, function (response) {
                loaderCount(-1);
                d.call(response);
            });
            return d;
        },
        http_post: function (url, params) {
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
        timeFormat: function (millisecs) {
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
        sparqlOnFly: function (result) {
            var html = jQuery('<div></div>');
            var a;
            // {head, results}

            // variables used in query
            var vars = result.head.vars;

            _.each(result.results.bindings, function (value) {
                // value = var { type, value }
                var found_value = value;
                _.each(vars, function (name) {
                    if (!_.isUndefined(found_value[name])) {
                        if (found_value[name].type == 'uri' && checkExtention(found_value[name].value))
                            a = ich.image_show(found_value[name]);
                        else
                        if (typeof ich.templates[rdftypes[found_value[name].type]] != 'undefined') {
                            a = ich[rdftypes[found_value[name].type]](found_value[name]);
                        }
                        else
                            a = ich.ns_type(found_value[name]);
                    }
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
            $(article).find(".prettyprint").each(function () {
                $(this).html(htmlEncoder.XSSEncode($(this).html()), true);
            })

        },
        /**
         * Saving SPARQL JSON result to a page cache system
         * @param pageid    id of a page
         * @param name      query name
         * @param result    result
         */
        saveToCache: function (pageid, name, result) {
            this.http_post("/update_cache", {
                pageid: pageid,
                name: name,
                result: result
            }).next(function (data) {
                    console.log(data);
                })
        },
        /**
         * Loading page's cache
         * @param pageid
         */
        loadCache: function (pageid) {
            var d = Deferred();
            this.http_post("/load_cache", {
                pageid: pageid
            }).next(function (cache) {
                    d.call(cache);
                });
            return d;
        },
        /**
         * Loading page's meta
         * @param pageid
         */
        loadMeta: function (pageid) {
            var d = Deferred();
            this.http_post("/load_meta", {
                pageid: pageid
            }).next(function (meta) {
                    d.call(meta);
                });
            return d;
        },
        searchMeta: function (value) {
            var d = Deferred();
            this.http_post("/search_meta", {
                value: value
            }).next(function (result) {
                    d.call(result);
                });
            return d;
        },
        /**
         * Load an article which we would like use such as template
         * @param pageid
         * @returns {*}
         */
        loadTemplate: function(pageid) {
            var d = Deferred();
            this.http_post("/load_template", {
                pageid: pageid
            }).next(function(template) {
                    d.call(template);
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
        },
        changeParentPage: function (pageid, parentid) {
            var d = Deferred();
            this.http_post("/change_parent", {pageid: pageid, parentid: parentid}).next(function (data) {
                d.call(data);
            });
            return d;
        },
        constructTreeView: function () {
            // need to load tree from server
            this.http_get("/links").next(function (result) {
                if (result.status == 'ok') {
                    // construction
                    // page = {_id,title,parent}
                    //console.log(result.pages);
                    var sorted = [];
                    var sort_it_by_parent = function (parent, pages) {
                        //_.each(pages,function(value,key) {
                        for (var i = 0; i < pages.length; i++) {
                            var value = pages[i];
                            if (_.isUndefined(value.pages)) {
                                value.pages = [];
                                value.url = "/wiki/" + value._id;
                            }
                            if (!_.isUndefined(value.parent) && value.parent.$id == parent._id) {
                                parent.pages.push(value);
                                sort_it_by_parent(value, pages);
                            }
                        }
                    };
                    _.each(result.pages, function (value, key) {
                        if (_.isUndefined(value.pages)) {
                            value.pages = [];
                            value.url = "/wiki/" + value._id;
                        }
                        if (_.isUndefined(value.parent)) {
                            sorted.push(value);
                            sort_it_by_parent(value, result.pages);
                        }
                    });
                    var forTemplate = {};
                    forTemplate.pages = sorted;

                    $("body").append(ich.treeview(forTemplate));
                    // click on a page
                    $(".treeview_item").click(function(){
                        //console.log($(this).data('url'));
                        var data = {
                            url : $(this).data('url'),
                            id : $(this).data('id')
                        };
                        // send data to a callback function
                        selectDialogCallback(data);
                        // hide dialog
                        $("#select-page-dialog").modal('hide');
                    });
                }
            });
        },
        /**
         * Select Page Dialog invoke
         * @param callback - function has 1 parameter - object, currently has only url and id ( data['url'] )
         */
        selectPageDialog : function(callback) {
            $("#select-page-dialog").modal('show');
            selectDialogCallback = callback;

        }
    }
})();
var createPage;
$(document).ready(function(){

    wikinextHelper.init().next(function(){
        if (typeof document.wikinextReady == 'function'){
            document.wikinextReady();
        }
    });

    createPage = function() {
        $('#create-page').modal('hide');
//        $("#create-page-form").submit();
        wikinextHelper.createPage($('#page_name').val(),$('#parent').val()).next(function(data){
            window.location = "/wiki/"+data['pageid'];
        });
    };

    $("#create-page-button").click(function () {
        createPage();
    });

    $("#delete-page-button").click(function (){
        $.get("/wiki/"+page['_id']+"/remove",function(status){
           document.location = "/home";
        });
    });

    $("#goto").click(function () {
        // invoking select page dialog
        wikinextHelper.selectPageDialog(function (data) {
            // go to another page
            location.href = '/wiki/'+data['id'];
        });
        return false;
    });

    (function($) {
        RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        RDF_PLAIN_LITERAL = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral';
        RDF_TYPED_LITERAL = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#TypedLiteral';
        RDF_XML_LITERAL = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral';
        RDF_OBJECT = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object';

        window.wikinext = window.wikinext || {};
        var wikinext = window.wikinext;


        // known prefixes used to shorten IRIs during the TURTLE transformation
        wikinext.knownPrefixes = {
            // w3c
            'grddl': 'http://www.w3.org/2003/g/data-view#',
            'ma': 'http://www.w3.org/ns/ma-ont#',
            'owl': 'http://www.w3.org/2002/07/owl#',
            'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            'rdfa': 'http://www.w3.org/ns/rdfa#',
            'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
            'rif': 'http://www.w3.org/2007/rif#',
            'skos': 'http://www.w3.org/2004/02/skos/core#',
            'skosxl': 'http://www.w3.org/2008/05/skos-xl#',
            'wdr': 'http://www.w3.org/2007/05/powder#',
            'void': 'http://rdfs.org/ns/void#',
            'wdrs': 'http://www.w3.org/2007/05/powder-s#',
            'xhv': 'http://www.w3.org/1999/xhtml/vocab#',
            'xml': 'http://www.w3.org/XML/1998/namespace',
            'xsd': 'http://www.w3.org/2001/XMLSchema#',
            // non-rec w3c
            'sd': 'http://www.w3.org/ns/sparql-service-description#',
            'org': 'http://www.w3.org/ns/org#',
            'gldp': 'http://www.w3.org/ns/people#',
            'cnt': 'http://www.w3.org/2008/content#',
            'dcat': 'http://www.w3.org/ns/dcat#',
            'earl': 'http://www.w3.org/ns/earl#',
            'ht': 'http://www.w3.org/2006/http#',
            'ptr': 'http://www.w3.org/2009/pointers#',
            // widely used
            'cc': 'http://creativecommons.org/ns#',
            'ctag': 'http://commontag.org/ns#',
            'dc': 'http://purl.org/dc/terms/',
            'dcterms': 'http://purl.org/dc/terms/',
            'foaf': 'http://xmlns.com/foaf/0.1/',
            'gr': 'http://purl.org/goodrelations/v1#',
            'ical': 'http://www.w3.org/2002/12/cal/icaltzd#',
            'og': 'http://ogp.me/ns#',
            'rev': 'http://purl.org/stuff/rev#',
            'sioc': 'http://rdfs.org/sioc/ns#',
            'v': 'http://rdf.data-vocabulary.org/#',
            'vcard': 'http://www.w3.org/2006/vcard/ns#',
            'schema': 'http://schema.org/'
        };

        /**
         * Used to initialize the UI, call once on document load.
         */
        wikinext.init = function() {

        };

        /**
         * Process the RDFa markup that has been input and display the output
         * in the active tab.
         */
        wikinext.process = function() {
            var preview = window.document;

            if(!preview.data)
            {
                GreenTurtle.attach(preview);
            }
            else
            {
                GreenTurtle.attach(preview, true);
            }

            var d3Nodes = wikinext.toD3TreeGraph(preview.data);

            wikinext.viz.redraw(d3Nodes);
        };

        /**
         * Attempts to retrieve the short name of an IRI based on the fragment
         * identifier or last item in the path.
         *
         * @param iri the IRI to process
         * @param hashify if true, pre-pend a hash character if the shortening results
         *                in a fragment identifier.
         * @returns a short name or the original IRI if a short name couldn't be
         *          generated.
         */
        wikinext.getIriShortName = function(iri, hashify) {
            var rval = iri;

            // find the last occurence of # or / - short name is everything after it
            if(iri.indexOf('#') >= 0) {
                if(hashify) {
                    rval = '#' + iri.split('#').pop();
                }
                else {
                    rval = iri.split('#').pop();
                }
            }
            else if(iri.indexOf('/') >= 0) {
                rval = iri.split('/').pop();
            }

            // don't allow the entire IRI to be optimized away
            if(rval.length < 1) {
                rval = iri;
            }

            return rval;
        };

        /**
         * Converts the RDFa data in the page to a D3 tree graph for visualization.
         *
         * @param data the reference to the RDFa DataDocument API.
         */
        wikinext.toD3TreeGraph = function(data) {
            var bnodeNames = {};
            var bnodeCount = 1;
            var rval = {
                'name': 'Web Page',
                'children': []
            };

            var subjects = data.getSubjects();
            var embedded = {};

            var createNode = function(s, p, data, rval) {
                var triples = data.getSubject(s);
                var predicates = triples === null ? [] : triples.predicates;
                var name = '';
                var node = {
                    'name': '',
                    'children': []
                };

                // calculate the short name of the node
                // prepend the predicate name if there is one
                if(p !== undefined) {
                    name = wikinext.getIriShortName(p) + ': ';
                }

                if(s.charAt(0) == '_') {
                    name += 'Item ' + bnodeNames[s];
                }
                else if(p == RDF_TYPE) {
                    name += wikinext.getIriShortName(s);
                }
                else {
                    name += wikinext.getIriShortName(s, true);
                }
                node.name = name;

                // create nodes for all predicates and objects
                for(p in predicates)
                {
                    // do not include which vocabulary was used in the visualization
                    if(p == "http://www.w3.org/ns/rdfa#usesVocabulary") {
                        continue;
                    }

                    var objects = triples.predicates[p].objects;
                    for(oi in objects) {
                        var value = '';
                        var o = objects[oi];

                        if(o.type == RDF_OBJECT) {
                            // recurse to create a node for the object if it's an object
                            createNode(o.value, p, data, node);
                            embedded[o.value] = true;
                        }
                        else {
                            // generate the leaf node
                            var name = '';
                            if(o.type == RDF_XML_LITERAL) {
                                // if the property is an XMLLiteral, serialise it
                                name = wikinext.nodelistToXMLLiteral(o.value);
                            }
                            else {
                                name = o.value;
                            }

                            var child = {
                                'name': wikinext.getIriShortName(p) + ': ' + name
                            };
                            node.children.push(child);
                        }
                    }
                }

                // remove the children property if there are no children
                if(node.children.length === 0) {
                    node.children = undefined;
                }
                // collapse children of nodes that have already been embedded
                if(embedded[s] !== undefined && node.children !== undefined) {
                    node._children = node.children;
                    node.children = undefined;
                }

                rval.children.push(node);
            };

            // Pre-generate names for all bnodes in the graph
            for(si in subjects) {
                var s = subjects[si];

                // calculate the short name of the node
                if(s.charAt(0) == '_' && !(s in bnodeNames)) {
                    bnodeNames[s] = bnodeCount;
                    bnodeCount += 1;
                }
            }

            // Generate the D3 tree graph
            for(si in subjects) {
                var s = subjects[si];
                createNode(s, undefined, data, rval);
            }

            // clean up any top-level children with no data
            var cleaned = [];
            for(c in rval.children)
            {
                var child = rval.children[c];
                if(child.children !== undefined)
                {
                    cleaned.push(child);
                }
            }
            rval.children = cleaned;

            return rval;
        };

        /**
         * Attempts to compress an IRI and updates a map of used prefixes if the
         * compression was successful.
         *
         * @param iri the IRI to compress into a Compact URI Expression.
         * @param prefixes the map of prefixes that have already been compressed.
         */
        wikinext.iriToCurie = function(iri, prefixes)
        {
            var rval = iri;
            var detectedPrefix = false;

            for(prefix in wikinext.knownPrefixes) {
                var expanded = wikinext.knownPrefixes[prefix];

                // if the IRI starts with a known CURIE prefix, compact it
                if(iri.indexOf(expanded) == 0) {
                    rval = prefix + ':' + iri.replace(expanded, '');
                    prefixes[prefix] = expanded;
                    break;
                }
            }

            if(rval.length == iri.length) {
                rval = '<' + iri + '>';
            }

            return rval;
        };

        /**
         * Converts a NodeList into an rdf:XMLLiteral string.
         *
         * @param nodelist the nodelist.
         */
        wikinext.nodelistToXMLLiteral = function(nodelist) {
            var str = '';
            for(var i = 0; i < nodelist.length; i++) {
                var n = nodelist[i];
                str += n.outerHTML || n.nodeValue;
            }
            return str;
        };

        /**
         * Converts the RDFa data in the page to a N-Triples representation.
         *
         * @param data the reference to the RDFa DataDocument API.
         */
        wikinext.toTurtleLite = function(data) {
            var rval = '';
            var subjects = data.getSubjects();
            for(si in subjects) {
                var s = subjects[si];
                var triples = data.getSubject(s);
                var predicates = triples.predicates;

                for(p in predicates)
                {
                    var objects = triples.predicates[p].objects;

                    for(oi in objects) {
                        var o = objects[oi];

                        // print the subject
                        if(s.charAt(0) == '_') {
                            rval += s + ' ';
                        }
                        else {
                            rval += '<' + s + '> ';
                        }

                        // print the predicate
                        rval += '<' + p + '> ';

                        //console.log(o);
                        // print the object
                        if(o.type == RDF_PLAIN_LITERAL) {
                            rval += '"' + o.value.replace('"', '\\"') + '"';
                            if(o.language != null) {
                                rval += '@' + o.language;
                            }
                        }
                        else if(o.type == RDF_OBJECT) {
                            if(o.value.charAt(0) == '_') {
                                rval += o.value;
                            }
                            else {
                                rval += '<' + o.value + '>';
                            }
                        }
                        else
                        {
                            rval += o.value;
                        }

                        rval += ' .\n';
                    }
                }
            }

            return rval;
        };

        /**
         * Converts the RDFa data in the page to a TURTLE representation of the data.
         *
         * @param data the reference to the RDFa DataDocument API.
         */
        wikinext.toTurtle = function(data) {
            var rval = '';
            var prefixesUsed = {};

            var subjects = data.getSubjects();
            for(var si in subjects) {
                var s = subjects[si];
                var triples = data.getSubject(s);
                var predicates = triples.predicates;

                // print the subject
                if(s.charAt(0) == '_') {
                    rval += s + ' ';
                }
                else {
                    rval += '<' + s + '>';
                }
                rval += '\n';

                var pList = [];
                for(p in predicates) { pList.push(p) }
                var lastP = pList.length - 1;

                for(pi in pList)
                {
                    var p = pList[pi];
                    var objects = triples.predicates[p].objects;
                    var lastO = objects.length - 1;

                    for(oi in objects) {
                        var o = objects[oi];

                        // print the predicate, as a CURIE if possible
                        rval += '   ' + wikinext.iriToCurie(p, prefixesUsed) + ' ';

                        //console.log(o);
                        // print the object
                        if(o.type == RDF_PLAIN_LITERAL) {
                            var lit = o.value.replace('"', '\\"');
                            var sep = '"';
                            if (lit.indexOf('\n') > -1) {
                                sep = '"""';
                            }
                            rval += sep + lit + sep;
                            if(o.language != null) {
                                rval += '@' + o.language;
                            }
                        }
                        else if(o.type == RDF_OBJECT) {
                            if(o.value.charAt(0) == '_') {
                                rval += o.value;
                            }
                            else {
                                rval += wikinext.iriToCurie(o.value, prefixesUsed);
                            }
                        }
                        else if(o.type == RDF_XML_LITERAL) {
                            rval += '"';
                            rval += wikinext.nodelistToXMLLiteral(o.value).replace('"', '\\"');
                            rval += '"^^rdf:XMLLiteral';
                        }
                        else if(o.type != null) {
                            rval += '"' + o.value.replace('"', '\\"') + '"' + '^^' +
                                wikinext.iriToCurie(o.type, prefixesUsed);
                        }
                        else
                        {
                            console.log("UNCAUGHT TYPE", o);
                            rval += o.value;
                        }

                        // place the proper TURTLE statement terminator on the data
                        if (pi == lastP && oi == lastO) {
                            rval += ' .\n';
                        } else {
                            rval += ';\n';
                        }
                    }
                }
            }

            // prepend the prefixes used to the TURTLE representation.
            var prefixHeader = '';
            for(var prefix in prefixesUsed)
            {
                prefixHeader +=
                    '@prefix ' + prefix +': <' + prefixesUsed[prefix] + '> .\n';
            }
            rval = prefixHeader + '\n' + rval;

            return rval;
        };

        // setup the visualization viewport
        var m = [20, 120, 20, 120],
            w = 1024 - m[1] - m[3],
            h = 450 - m[0] - m[2],
            i = 0,
            root;

        var id = "wikinext_semantic_graph";

        wikinext.viz = {};
        var viz = wikinext.viz;
        /**
         * Redraw the graph visualization on the screen.
         */
        viz.redraw = function(nodes) {
            // delete any old SVG document
            $('#'+id).empty();

            // create a new tree layout
            viz.tree = d3.layout.tree()
                .size([h, w])
                .separation(function (a, b) {
                    var descendants = function(node) {
                        var count = 0;
                        for(d in node.children) {
                            count++;
                            count += descendants(node.children[d]);
                        }
                        return count;
                    };
                    var aDesc = Math.max(descendants(a), a.parent == b.parent ? 1 : 2);
                    var bDesc = Math.max(descendants(b), a.parent == b.parent ? 1 : 2);
                    return (aDesc + bDesc) / 2;
                });

            // create the projection
            viz.diagonal = d3.svg.diagonal()
                .projection(function(d) { return [d.y, d.x]; });

            // create the view for the graph
            viz.view = d3.select("#"+id).append("svg:svg")
                .attr("width", w + m[1] + m[3])
                .attr("height", h + m[0] + m[2])
                .append("svg:g")
                .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

            // set the root value
            root = nodes;

            // if root is invalid, fix it
            if(root == undefined)
            {
                root = {'name': 'Web Page'};
            }

            // set the RDF data
            viz.tree.nodes(root);

            // set the root X and Y starting location? I don't really know what this does.
            root.x0 = h / 2;
            root.y0 = 0;

            // update the visualization
            viz.update(root);
        };

        viz.update = function(source) {
            var duration = d3.event && d3.event.altKey ? 5000 : 500;

            // Compute the new tree layout.
            var nodes = viz.tree.nodes(root).reverse();

            // Normalize for fixed-depth.
            nodes.forEach(function(d) { d.y = d.depth * 180; });

            // Update the nodes…
            var node = viz.view.selectAll("g.node")
                .data(nodes, function(d) { return d.id || (d.id = ++i); });

            // Enter any new nodes at the parent's previous position.
            var nodeEnter = node.enter().append("svg:g")
                .attr("class", "node")
                .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                .on("click", function(d) { viz.toggle(d); viz.update(d); });

            nodeEnter.append("svg:circle")
                .attr("r", 1e-6)
                .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

            nodeEnter.append("svg:text")
                .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
                .attr("dy", ".35em")
                .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
                .text(function(d) { return d.name; })
                .style("fill-opacity", 1e-6);

            // Transition nodes to their new position.
            var nodeUpdate = node.transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

            nodeUpdate.select("circle")
                .attr("r", 4.5)
                .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

            nodeUpdate.select("text")
                .style("fill-opacity", 1);

            // Transition exiting nodes to the parent's new position.
            var nodeExit = node.exit().transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
                .remove();

            nodeExit.select("circle")
                .attr("r", 1e-6);

            nodeExit.select("text")
                .style("fill-opacity", 1e-6);

            // Update the links…
            var link = viz.view.selectAll("path.link")
                .data(viz.tree.links(nodes), function(d) { return d.target.id; });

            // Enter any new links at the parent's previous position.
            link.enter().insert("svg:path", "g")
                .attr("class", "link")
                .attr("d", function(d) {
                    var o = {x: source.x0, y: source.y0};
                    return viz.diagonal({source: o, target: o});
                })
                .transition()
                .duration(duration)
                .attr("d", viz.diagonal);

            // Transition links to their new position.
            link.transition()
                .duration(duration)
                .attr("d", viz.diagonal);

            // Transition exiting nodes to the parent's new position.
            link.exit().transition()
                .duration(duration)
                .attr("d", function(d) {
                    var o = {x: source.x, y: source.y};
                    return viz.diagonal({source: o, target: o});
                })
                .remove();

            // Stash the old positions for transition.
            nodes.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        };

        // Toggle children.
        viz.toggle = function(d) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
        };
    })(jQuery);

});
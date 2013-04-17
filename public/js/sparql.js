/**
 *
 * This class help to get content by using a SPARQL endpoint
 * This class use jQuery 1.7+
 *
 * @author Damien Legrand  < http://damienlegrand.com >
 */

function SPARQL()
{
    /**
     *
     * ATTRIBUTES
     *
     **/

        //The endpoint base URL without parameters
    this.baseUrl 		= "http://dbpedia.org/sparql";

    //The result's type
    this.format 		= "json";

    //The GET or POST parameter name for the query
    this.queryParam 	= "query";

    //The GET or POST parameter name for the result's format
    this.formatParam 	= "format";

    //GET or POST
    this.method 		= "GET";
    this.values			= "";

    //If you need to atache some information (will be return to the callback)
    this.info 			= null;

    //The SPARQL request
    this.sparql 		= "";

    this.ajax = null;

    //Arrays to build the request
    this.prefixes 		= [];
    this.distinctSelect = false;
    this.variables 		= [];
    this.wheres 		= [];
    this.orders			= [];
    this.limitNb		= null;
    this.offsetNb		= null;
    this.unions 		= false;


    /**
     *
     * METHODS
     *
     **/

    this.prefixe 				= function(ns, x) 	{ this.prefixes.push("PREFIX " + ns + ": <" + x + ">"); return this; };
    this.distinct				= function(bool)	{ this.distinctSelect = bool; return this;};
    this.variable 				= function(x) 		{ this.variables.push(x); return this; };
    this.where 					= function(x, y, z) { this.wheres.push(x + " " + y + " " + z); return this; };
    this.optionalWhere 			= function(x, y, z) { this.wheres.push("OPTIONAL {" + x + " " + y + " " + z + "}"); return this; };
    this.complexeOptionalWhere 	= function(x) 		{ this.wheres.push("OPTIONAL " + x.buildWhere()); return this; };
    this.union 					= function(x) 		{ if(!this.unions) { this.unions = true; this.wheres.push(x.buildWhere()); }else{ this.wheres.push("UNION " + x.buildWhere()); } return this; };
    this.filter 				= function(x) 		{ this.wheres.push("FILTER ( " + x + " )"); return this; };
    this.orderBy 				= function(x) 		{ this.orders.push(x); return this; };
    this.limit 					= function(x) 		{ this.limitNb = x; return this; };
    this.offset 				= function(x) 		{ this.offestNb = x; return this; };
    this.setInfo				= function(x) 		{ this.info = x; return this; };

    this.build 		= function() {
        var sp = "";

        //PREFIXES
        for(var i = 0; i < this.prefixes.length; i++)
        {
            sp += this.prefixes[i] + "\n";
        }

        //VARIABLES
        sp += "SELECT ";

        if(this.distinctSelect) sp += "DISTINCT ";

        if(this.variables.length > 0)
        {
//            var first = true;
//            for(var i = 0; i < this.variables.length; i++)
//            {
//                if(first) first = false;
//                else if(i < this.variables.length) sp += ", ";
//                sp += this.variables[i];
//            }
            sp += this.variables.join(" ");
        }
        else sp += "*";

        //WHERES
        sp += "\nWHERE";

        //if(this.unions.length > 0) sp += "\n{";

        var w = this.buildWhere();

        sp += w;

        //UNIONS
        /*var first = true;
         for(var i = 0; i < this.unions.length; i++)
         {
         var u = this.unions[i].buildWhere();

         if(u != "")
         {
         if(first)
         {
         first = false;
         if(w != "") sp += "UNION";
         }else sp += "UNION";

         sp += u;
         }
         }

         if(this.unions.length > 0) sp += "\n}\n";
         */

        //ORDER BY
        if(this.orders.length > 0)
        {
            sp += "ORDER BY ";
//            var first = true;
//            for(var i = 0; i < this.orders.length; i++)
//            {
//                if(first) first = false;
//                else if(i < this.orders.length) sp += ", ";
//                sp += this.orders[i];
//            }
            sp += this.orders.join(" ");
        }

        //LIMIT
        if(this.limitNb != null) sp += "LIMIT " + this.limitNb + "\n";

        //OFFSET
        if(this.offsetNb != null) sp += "OFFSET " + this.offsetNb + "\n";

        return sp;
    }

    this.buildWhere = function() {
        var sp = "";
        if(this.wheres.length == 0) return sp;

        sp += "\n{\n";

        for(var i = 0; i < this.wheres.length; i++)
        {
            sp += this.wheres[i];
            if(i < this.wheres.length - 1 && sp[sp.length-2] != '}') sp += " .";

            sp += "\n";
        }

        sp += "}\n";

        return sp;
    };

    this.execute = function(callback) {

        if(this.sparql == "") this.sparql = this.build();
        //console.log(this.sparql);
        var cur = this;
        var data = {};
        data[this.formatParam] = this.format;
        data[this.queryParam] = this.sparql;
        this.ajax = $.ajax({
            type: this.method,
            url: this.baseUrl,
            data: data,
            dataType: this.format
        }).done(function( data ) {
                callback(data, cur.info);
                cur.sparql = "";
            });
    }

    this.abort = function() {
        if(this.ajax != null) this.ajax.abort();
    }

}
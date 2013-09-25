var helper = (function () {
    return {
        /**
         * Looking for a value in array
         * @param needle - value that we would like to find
         * @param haystack - array to check
         * @param argStrict - type of checking (=== or ==) - boolean
         * @returns {boolean}
         */
        in_array: function (needle, haystack, argStrict) {
            var key = '',
                strict = !!argStrict;

            if (strict) {
                for (key in haystack) {
                    if (haystack[key] === needle) {
                        return true;
                    }
                }
            } else {
                for (key in haystack) {
                    if (haystack[key] == needle) {
                        return true;
                    }
                }
            }

            return false;
        },

        /**
         * Cloning the object/array
         * @param obj
         * @returns {*}
         */
        clone: function (obj) {
            // Handle the 3 simple types, and null or undefined
            if (null == obj || "object" != typeof obj) return obj;

            // Handle Date
            if (obj instanceof Date) {
                var copy = new Date();
                copy.setTime(obj.getTime());
                return copy;
            }

            // Handle Array
            if (obj instanceof Array) {
                var copy = [];
                for (var i = 0, len = obj.length; i < len; i++) {
                    copy[i] = this.clone(obj[i]);
                }
                return copy;
            }

            // Handle Object
            if (obj instanceof Object) {
                var copy = {};
                for (var attr in obj) {
                    if (obj.hasOwnProperty(attr)) copy[attr] = this.clone(obj[attr]);
                }
                return copy;
            }

            throw new Error("Unable to copy obj! Its type isn't supported.");
        },

        /**
         * Do the string "fdfasdf wfqw cQDASD" as "Fdfasdf Wfgq Cqdasd"
         * @param string
         * @returns {string}
         */
        capitalize: function (string) {
//    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
//    return string.replace(/\b./g, function(m){ return m.toUpperCase(); });
            var strArr = string.split(" ");
            var newArr = [];

            for (var i = 0; i < strArr.length; i++) {

                var FirstLetter = strArr[i].charAt(0).toUpperCase();
                var restOfWord = strArr[i].slice(1).toLowerCase();

                newArr[i] = FirstLetter + restOfWord;

            }

            return newArr.join(' ');
        }
    }
});

module.exports = helper;
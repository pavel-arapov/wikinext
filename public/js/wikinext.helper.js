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
    return {
        init:function () {
            var d = new Deferred();
            var self = this;
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
        }
    }
})();
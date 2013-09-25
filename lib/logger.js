var winston = require('winston');

var customLevels = {
    levels: {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    },
    colors: {
        debug: 'blue',
        info: 'green',
        warn: 'yellow',
        error: 'red'
    }
};

var logger = new (winston.Logger)({
    level: 'debug',
    levels: customLevels.levels,
    transports: [
        new winston.transports.File({
            filename: __dirname+'/../logs/debug.log',

            maxsize: 1024 * 1024 * 10, // 10MB
            levels: customLevels.levels,
            level: 'debug',
            json: false
        })
    ],
    exceptionHandlers: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: __dirname+'/../logs/exceptions.log',
            json: false
        })
    ],
    exitOnError: false
});

var accessLoger = new (winston.Logger)({
    level: 'debug',
    levels: customLevels.levels,
    transports: [
        new winston.transports.File({
            filename: __dirname+'/../logs/access.log',

            maxsize: 1024 * 1024 * 10, // 10MB
            levels: customLevels.levels,
            level: 'debug',
            json: false
        })
    ]
});

// make winston aware of your awesome colour choices
winston.addColors(customLevels.colors);

module.exports = { logger: logger, accessLogger: accessLoger };
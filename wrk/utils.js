var toPrettyDate = function (d, day, dayoffset) {
    var pad = function (num) { return ('00' + num).slice(-2) };
    let date = '';
    if (day) { date += pad(d.getUTCDate()+dayoffset) + '/'; }
    date += pad(d.getUTCMonth()) + '/' +
        d.getUTCFullYear();
    return date;
}

var toPrettyDatetime = function(date) {
    var pad = function (num) { return ('00' + num).slice(-2) };
    date = pad(date.getUTCDate()) + '/' +
        pad(date.getUTCMonth() + 1) + '/' +
        date.getUTCFullYear() + ' ' +
        pad(date.getUTCHours() + 2) + ':' +
        pad(date.getUTCMinutes()) + ':' +
        pad(date.getUTCSeconds());
    return date;
}

var logInfo = function(message){
    log(message, "\x1b[37m");
}

var logError = function(message){
    log(message, "\x1b[31m");
}

var logWarning = function(message){
    log(message, "\x1b[33m");
}

var logSuccess = function(message){
    log(message, "\x1b[32m");
}

var log = function(message, color){
    console.log(color, `[${toPrettyDatetime(new Date())}] ${message}`);
}

module.exports = {
    toPrettyDate,
    logInfo,
    logError,
    logWarning,
    logSuccess,
}
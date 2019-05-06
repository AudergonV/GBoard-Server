var mysql = require('mysql');
var utils = require('./utils');

var connection;

var open = function (host, user, password, dbname) {
    connection = mysql.createConnection({
        host: host,
        user: user,
        password: password,
        database: dbname
    });
    connection.connect(function (err) {
        if (err) {
            utils.logError('Erreur lors de la connexion à la DB ' + err.stack);
            return;
        }
        utils.logSuccess('Base de données connectée avec l\'ID ' + connection.threadId);
    });
};

var close = function () {
    connection.end();
};




/* ================================ */

module.exports = {
    open,
    close,
}
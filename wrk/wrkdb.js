var mysql = require('mysql');
var utils = require('./utils');

var connection;

var open = async function (host, user, password, dbname) {
    connection = mysql.createConnection({
        host: host,
        user: user,
        password: password,
        database: dbname
    });
    await connection.connect(function (err) {
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

var getUserSecret = function (id, callback) {
    vals = [id];
    var query = "SELECT pk_user as id, secret, salt FROM t_user WHERE pk_user = ?";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results[0]);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        console.log(error);
        callback(undefined);
    }
};

var getUserById = function (id, callback) {
    vals = [id];
    var query = "SELECT pk_user as id, username, admin FROM t_user WHERE pk_user = ?";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results[0]);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        console.log(error);
        callback(undefined);
    }
};

var getUsers = function (callback) {
    var query = "SELECT pk_user as id, username, admin FROM t_user";
    try {
        connection.query(query, function (error, results, fields) {
            callback(results);
        });
    } catch (error) {
        console.log(error);
        callback(undefined);
    }
};

var getUserByUsername = function (id, callback) {
    vals = [id];
    var query = "SELECT pk_user as id, username, admin FROM t_user WHERE username = ?";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results[0]);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        console.log(error);
        callback(undefined);
    }
};

var createUser = function (username, salt, secret, callback) {
    var vals = [username, salt, secret];
    var query = "INSERT INTO t_user (`username`, `salt`, `secret`) VALUES (?,?,?)";
    try {
        connection.query(query, vals, function (error, results, fields) {
            callback(results !== undefined && results.affectedRows === 1);
        });
    } catch (error) {
        console.log(error);
        callback(false);
    }
};

var updateUser = function (id, username, salt, secret, callback) {
    var vals = [username, secret, salt, id];
    var query = "UPDATE `t_user` SET `username`=?,`secret`=?,`salt`=? WHERE pk_user = ?";
    try {
        connection.query(query, vals, function (error, results, fields) {
            callback(results !== undefined && results.affectedRows === 1);
        });
    } catch (error) {
        console.log(error);
        callback(false);
    }
};

var deleteUser = function (id, callback) {
    var vals = [id];
    var query = "DELETE FROM `t_user` WHERE pk_user=?";
    try {
        connection.query(query, vals, function (error, results, fields) {
            callback(results !== undefined && results.affectedRows === 1);
        });
    } catch (error) {
        console.log(error);
        callback(false);
    }
};

var createBrowser = function (browser, callback) {
    var vals = [browser.useragent, browser.name, browser.os, browser.icon, browser.os_icon];
    var query = "INSERT INTO `t_browser`(`pk_browser`, `name`, `os`, `icon`, `os_icon`) VALUES (?,?,?,?,?)";
    try {
        connection.query(query, vals, function (error, results, fields) {
            callback(results !== undefined && results.affectedRows === 1);
        });
    } catch (error) {
        utils.logError(error);
        callback(false);
    }
};

var getBrowser = function (useragent, callback) {
    var vals = [useragent];
    var query = "SELECT `pk_browser` as useragent, `name`, `os`, `icon`, `os_icon` FROM `t_browser` WHERE pk_browser = ?";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results[0]);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        utils.logError(error);
        callback(undefined);
    }
};

var createHit = function (hit, callback) {
    var vals = [hit.host, hit.url, hit.ip, hit.browser.useragent, new Date(hit.date)];
    var query = "INSERT INTO `t_hit`(`host`, `url`, `ip`, `fk_browser`, `date`) VALUES (?,?,?,?,?)";
    try {
        connection.query(query, vals, function (error, results, fields) {
            callback(results !== undefined && results.affectedRows === 1);
        });
    } catch (error) {
        utils.logError(error);
        callback(false);
    }
};

var getHits = function (callback) {
    var query = "SELECT `pk_hit` as id, `host`, `url`, `ip`, `fk_browser` as browser, `date` FROM `t_hit` ORDER BY date";
    try {
        connection.query(query, function (error, results) {
            callback(results);
        });
    } catch (error) {
        utils.logError(error);
        callback(false);
    }
};

var getHitsByHost = function (host, callback) {
    var vals = [host];
    var query = "SELECT `pk_hit` as id, `host`, `url`, `ip`, `fk_browser` as browser, `date` FROM `t_hit` WHERE host = ? ORDER BY date DESC LIMIT 10";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        utils.logError(error);
        callback(undefined);
    }
};

var deleteHitsByHost = function (host, callback) {
    var vals = [host];
    var query = "DELETE FROM `t_hit` WHERE host = ?";
    try {
        connection.query(query, vals, function (error, results, fields) {
            callback(results);
        });
    } catch (error) {
        utils.logError(error);
        callback(undefined);
    }
};

var getVisitsByHost = function (host, callback) {
    var vals = [host];
    var query = "SELECT count(`pk_hit`) as visits FROM `t_hit` WHERE host = ?";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results[0]);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        utils.logError(error);
        callback(undefined);
    }
};

var getDailyVisitsByHost = function (host, callback) {
    var vals = [host];
    var query = "SELECT count(`pk_hit`) as visits, DATE(`date`) as date FROM `t_hit` WHERE host = ? GROUP BY DATE(`date`) ORDER BY date desc limit 10";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        utils.logError(error);
        callback(undefined);
    }
};

var getMonthlyVisitsByHost = function (host, callback) {
    var vals = [host];
    var query = "SELECT count(`pk_hit`) as visits, DATE(`date`) as date FROM `t_hit` WHERE host = ? GROUP BY month(DATE(`date`)) ORDER BY DATE(`date`) desc limit 12";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        utils.logError(error);
        callback(undefined);
    }
};

var getVisitsByURL = function (host, callback) {
    var vals = [host];
    var query = "SELECT url, count(`pk_hit`) as visits FROM `t_hit` WHERE host = ? GROUP BY url";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        utils.logError(error);
        callback(undefined);
    }
};

var getVisitorsByHost = function (host, callback) {
    var vals = [host];
    var query = "SELECT COUNT(DISTINCT ip) as visits FROM t_hit where host = ?;";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results[0]);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        utils.logError(error);
        callback(undefined);
    }
};

var getVisitorsListByHost = function (host, callback) {
    var vals = [host];
    var query = "SELECT ip FROM t_hit where host = ? GROUP BY ip;";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        utils.logError(error);
        callback(undefined);
    }
};

var getDailyVisitorsByHost = function (host, callback) {
    var vals = [host];
    var query = "SELECT COUNT(DISTINCT ip) as visits, DATE(`date`) as date FROM t_hit where host = ? GROUP BY DATE(`date`) ORDER BY date desc limit 10";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        utils.logError(error);
        callback(undefined);
    }
};

var getDailyVisitorsListByHost = function (host, date, callback) {
    var vals = [host, date];
    var query = "SELECT ip FROM t_hit where host = ? and DATE(date) = DATE(?) GROUP BY ip;";
    try {
        connection.query(query, vals, function (error, results, fields) {
            if (results !== undefined) {
                callback(results);
            } else {
                callback(undefined);
            }
        });
    } catch (error) {
        utils.logError(error);
        callback(undefined);
    }
};



/* ================================ */

module.exports = {
    open,
    close,
    createHit,
    getHits,
    getHitsByHost,
    getBrowser,
    createBrowser,
    getDailyVisitorsByHost,
    getVisitorsByHost,
    getVisitsByHost,
    getDailyVisitsByHost,
    getVisitsByURL,
    getMonthlyVisitsByHost,
    getVisitorsListByHost,
    getDailyVisitorsListByHost,
    deleteHitsByHost,
    getUserSecret,
    getUserById,
    getUsers,
    getUserByUsername,
    createUser,
    updateUser,
    deleteUser,
}
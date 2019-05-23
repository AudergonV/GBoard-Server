var wrkdb = require("../wrk/wrkdb");
var utils = require("../wrk/utils");
var wrkpassword = require("../wrk/wrkpassword");

const MSG = {
    forbidden: "Vous n'avez pas le droit d'effectuer cette action."
};

const VERSION = "1.2";

var openDB = async function (credentials) {
    await wrkdb.open(credentials.host, credentials.user, credentials.password, credentials.dbname);
};

var closeDB = function () {
    wrkdb.close();
};

var getVersion = function () {
    return VERSION;
};


//*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
//              Auth
//*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*

var verifyPassword = function (username, password, callback) {
    wrkdb.getUserByUsername(username, user => {
        if (user !== undefined) {
            wrkdb.getUserSecret(user.id, usersecret => {
                if (usersecret !== undefined) {
                    wrkpassword.verifyPassword(password, usersecret.secret, usersecret.salt, callback);
                } else {
                    callback(false);
                }
            });
        } else {
            callback(false);
        }
    });
};

//*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
//              Users
//*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*

var getUser = function (id, callback) {
    wrkdb.getUserById(id, result => {
        if (result !== undefined) {
            result.code = 200;
            callback(result);
        } else {
            callback({ code: 404, message: "Utilisateur introuvable." });
        }
    });
};

var getUsers = function (id, callback) {
    wrkdb.getUsers(result => {
        if (result !== undefined) {
            callback({ code: 200, users: result });
        } else {
            callback({ code: 404, message: "Utilisateur introuvable." });
        }
    });
};

var getUserByUsername = function (username, callback) {
    wrkdb.getUserByUsername(username, result => {
        if (result !== undefined) {
            result.code = 200;
            callback(result);
        } else {
            callback({ code: 404, message: "Utilisateur introuvable." });
        }
    });
};

var createUser = function (user, username, password, callback) {
    if (user.admin) {
        var creds = wrkpassword.saltHashPassword(password);
        wrkdb.createUser(username, creds.salt, creds.secret, result => {
            if (result) {
                callback({ code: 200, message: "Utilisateur créé avec succès." });
            } else {
                callback({ code: 500, message: "Une erreur est survenue lors de la création de l'utilisateur. Contactez un administrateur." });
            }
        });
    } else {
        callback({ code: 403, message: MSG.forbidden });
    }
};



var updateUser = function (user, id, username, password, callback) {
    if (user.id === id) {
        wrkdb.getUserById(id, result => {
            if (result !== undefined) {
                wrkdb.getUserSecret(id, creds => {
                    username = username === undefined ? result.username : username;
                    creds = password !== undefined ? wrkpassword.saltHashPassword(password) : creds;
                    wrkdb.updateUser(id, username, creds.salt, creds.secret, result => {
                        if (result) {
                            callback({ code: 200, message: "Utilisateur modifié avec succès." });
                        } else {
                            callback({ code: 500, message: "Une erreur est survenue lors de la modification de l'utilisateur. Contactez un administrateur." });
                        }
                    });
                });
            } else {
                callback({ code: 404, message: "Utilisateur introuvable, impossible de le modifier." });
            }
        });
    } else {
        callback({ code: 403, message: MSG.forbidden });
    }
};

var deleteUser = function (user, id, callback) {
    if (user.id === id) {
        wrkdb.getUserById(id, result => {
            if (result !== undefined) {
                wrkdb.deleteUser(id, result => {
                    if (result) {
                        callback({ code: 200, message: "Utilisateur supprimé avec succès." });
                    } else {
                        callback({ code: 500, message: "Une erreur est survenue lors de la suppression de l'utilisateur. Contactez un administrateur." });
                    }
                });
            } else {
                callback({ code: 404, message: "Utilisateur introuvable, impossible de le supprimer." });
            }
        });
    } else {
        callback({ code: 403, message: MSG.forbidden });
    }
};
//*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
//              Hits
//*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*

var createHit = function (hit, callback) {
    wrkdb.createHit(hit, result => {
        if (result) {
            callback({ code: 200, message: "Hit créé avec succès." });
        } else {
            callback({ code: 500, message: "Une erreur est survenue lors de la création du hit. Contactez un administrateur." });
        }
    });
}

var getHits = function (callback) {
    wrkdb.getHits(async results => {
        if (results !== undefined) {
            if (results.length > 0) {
                for (var r in results) {
                    var hit = results[r];
                    await new Promise(function (resolve, reject) {
                        wrkdb.getBrowser(hit.browser, b => {
                            resolve(b);
                        });
                    }).then(value => {
                        hit.browser = value;
                    });
                }
            }
            callback({ code: 200, hits: results });
        } else {
            callback({ code: 500, message: "Une erreur interne est survenue. Contactez un administrateur." })
        }

    });
};

var getHitsByHost = function (host, callback) {
    wrkdb.getHitsByHost(host, async results => {
        if (results !== undefined) {
            if (results.length > 0) {
                for (var r in results) {
                    var hit = results[r];
                    await new Promise(function (resolve, reject) {
                        wrkdb.getBrowser(hit.browser, b => {
                            resolve(b);
                        });
                    }).then(value => {
                        hit.browser = value;
                    });
                }
            }
            callback({ code: 200, hits: results });
        } else {
            callback({ code: 500, message: "Une erreur interne est survenue. Contactez un administrateur." })
        }
    });
};

var deleteHitsByHost = function (host, callback) {
    wrkdb.deleteHitsByHost(host, result => {
        if (result !== undefined) {
            if (result.affectedRows > 0) {
                callback({ code: 200, message: result.affectedRows + " visite(s) supprimée(s) avec succès" });
            } else {
                callback({ code: 200, message: "Aucune visite à supprimer" });
            }
        } else {
            callback({ code: 500, message: "Une erreur interne est survenue. Contactez un administrateur." })
        }
    });
};


var createBrowser = function (browser, callback) {
    wrkdb.createBrowser(browser, result => {
        if (result) {
            callback({ code: 200, message: "Browser créé avec succès." });
        } else {
            callback({ code: 500, message: "Une erreur est survenue lors de la création du browser. Contactez un administrateur." });
        }
    });
}

var getBrowser = function (useragent, callback) {
    wrkdb.getBrowser(useragent, result => {
        if (result !== undefined) {
            callback({ code: 200, browser: result });
        } else {
            callback({ code: 404, message: "Calendrier introuvable." });
        }
    });
};

var completeResults = function (nb, results, monthly) {
    let today = new Date();
    today.setDate(today.getDate() - 1);
    let newresults = [];
    for (let i = 0; i < nb; i++) {
        let ok = false;
        for (let r in results) {
            let result = results[r];
            if (utils.toPrettyDate(today, !monthly, 0) === utils.toPrettyDate(result.date, !monthly, 0)) { //Meme dates
                newresults[i] = result;
                ok = true;
                break;
            }
        }
        if (!ok) {
            newresults[i] = { visits: 0, date: new Date(today) }
        }
        if (monthly) {
            today.setMonth(today.getMonth() - 1);
        } else {
            today.setDate(today.getDate() - 1);
        }
    }
    return newresults;
}


var getVisitsByHost = function (host, callback) {
    wrkdb.getVisitsByHost(host, result => {
        if (result !== undefined) {
            callback({ code: 200, visits: result });
        } else {
            callback({ code: 404, message: "Host introuvable." });
        }
    });
};

var getDailyVisitsByHost = function (host, callback) {
    wrkdb.getDailyVisitsByHost(host, results => {
        if (results !== undefined) {
            results = completeResults(10, results, false);
            callback({ code: 200, visits: results });
        } else {
            callback({ code: 500, message: "Une erreur interne est survenue. Contactez un administrateur." })
        }
    });
};

var getMonthlyVisitsByHost = function (host, callback) {
    wrkdb.getMonthlyVisitsByHost(host, results => {
        if (results !== undefined) {
            results = completeResults(12, results, true);
            callback({ code: 200, visits: results });
        } else {
            callback({ code: 500, message: "Une erreur interne est survenue. Contactez un administrateur." })
        }
    });
};

var getVisitsByURL = function (host, callback) {
    wrkdb.getVisitsByURL(host, results => {
        if (results !== undefined) {
            callback({ code: 200, visits: results });
        } else {
            callback({ code: 500, message: "Une erreur interne est survenue. Contactez un administrateur." })
        }
    });
};

var getVisitorsByHost = function (host, callback) {
    wrkdb.getVisitorsByHost(host, total => {
        wrkdb.getVisitorsListByHost(host, result => {
            if (result !== undefined) {
                let visitors = [];
                for (v in result) {
                    let ip = result[v].ip;
                    visitors.push(ip);
                }
                callback({ code: 200, total: total.visits, visitors: visitors });
            } else {
                callback({ code: 404, message: "Host introuvable." });
            }
        });
    });
};

var getDailyVisitorsByHost = function (host, callback) {
    wrkdb.getDailyVisitorsByHost(host, async results => {
        if (results !== undefined) {
            results = completeResults(10, results, false);
            if (results.length > 0) {
                for (var r in results) {
                    var day = results[r];
                    await new Promise(function (resolve, reject) {
                        wrkdb.getDailyVisitorsListByHost(host, new Date(day.date), res => {
                            resolve(res);
                        });
                    }).then(value => {
                        day.visitors = [];
                        for (v in value) {
                            let ip = value[v].ip;
                            day.visitors.push(ip);
                        }
                    });
                }
            }
            callback({ code: 200, visitors: results });
        } else {
            callback({ code: 500, message: "Une erreur interne est survenue. Contactez un administrateur." })
        }
    });
};


module.exports = {
    openDB,
    closeDB,
    getVersion,
    getHits,
    getHitsByHost,
    createHit,
    getBrowser,
    createBrowser,
    getVisitorsByHost,
    getVisitsByHost,
    getDailyVisitsByHost,
    getMonthlyVisitsByHost,
    getDailyVisitorsByHost,
    getVisitsByURL,
    deleteHitsByHost,
    verifyPassword,
    getUser,
    getUsers,
    getUserByUsername,
    createUser,
    updateUser,
    deleteUser
};

/*
 * Description   :   Controller des interaction avec les application node via pm2
 * Date          :   10.05.2019
 * Auteur        :   Vincent Audergon
*/
var Foreverapp = require('../models/Foreverapp');
const FOREVER_ROOM = "/forever";
var apps = [];
let io;
let utils = require('../wrk/utils');
let oldconfig = undefined;

var loadConfig = function (config) {
    if (oldconfig === undefined) {
        for (let h in config.hosts) {
            let host = config.hosts[h];
            initHost(config, host);
            apps[host.hostname].authorizedusers = host.authorizedusers;
        }
    } else {
        for (let h in config.hosts) {
            let host = config.hosts[h];
            if (apps[host.hostname] === undefined) {
                initHost(config, host);
            } else {
                for (let oh in oldconfig.hosts) {
                    let oldhost = oldconfig.hosts[oh];
                    if (host.hostname === oldhost.hostname) {
                        if (host.filename !== oldhost.filename || host.dir !== oldhost.filename || host.port !== oldhost.port) { //Si il y a un changement pas rapport à l'ancienne config on recréé l'app
                            apps[host.hostname].destroy();
                            apps[host.hostname] = undefined;
                            initHost(config, host);
                        }
                        break;
                    }
                }
            }
            apps[host.hostname].authorizedusers = host.authorizedusers;
        }
    }
    oldconfig = config;
    utils.logInfo(`Configuration chargée dans le contrôleur de vhosts.`);
}

let initHost = function (config, host) {
    apps[host.hostname] = new Foreverapp(host.dir + host.filename, {
        cwd: host.dir,
        args: [host.port],
        outFile: config.logsdir + "/" + host.hostname + ".txt",
        errFile: config.logsdir + "/" + host.hostname + "_error.txt",
        max: 3,
        silent: true
    });
    apps[host.hostname].onStart = () => { io.sockets.in(FOREVER_ROOM).emit('fv_start', host.hostname, apps[host.hostname].starteddate); };
    apps[host.hostname].onStop = () => { io.sockets.in(FOREVER_ROOM).emit('fv_stop', host.hostname); };
    apps[host.hostname].onLog = (line) => { io.sockets.in(FOREVER_ROOM).emit('fv_log', host.hostname, String(line)) };
    apps[host.hostname].onErr = (message) => { utils.logError(`Une erreur est suvenue avec l'hôte virtuel ${host.hostname} : ${message}`); };
}

var init = function (i, socket) {
    io = i;
    socket.on('fv_join', () => {
        utils.logInfo('Socket ajouté dans la room ' + FOREVER_ROOM);
        socket.join(FOREVER_ROOM);
    });

    socket.on('fv_start', (host) => {
        checkAuth(socket, host, () => { if (apps[host] !== undefined) apps[host].startApp(); });
    });

    socket.on('fv_stop', (host) => {
        checkAuth(socket, host, () => { if (apps[host] !== undefined) apps[host].stopApp(); });
    });

    socket.on('fv_status', (host) => {
        checkAuth(socket, host, () => { io.sockets.in(FOREVER_ROOM).emit('fv_status', host, apps[host].toJSON()); });
    });
};

var checkAuth = function (socket, host, next) {
    if (socket.user !== undefined && apps[host] !== undefined) {
        if (apps[host].authorizedusers.indexOf(socket.user.id) !== -1) {
            next();
        } else {
            utils.logWarning(`${socket.user.username} a essayé d'atteindre une ressource interdite. (${host})`);
        }
    }
}

module.exports = { init, loadConfig };
/*
 * Description   :   Controller des interaction aves les serveurs de jeu
 * Date          :   24.04.2019
 * Auteur        :   Vincent Audergon
*/

var Foreverapp = require('../models/Foreverapp');
var fs = require('fs');
const GAME_SERVERS_ROOM = "/gameservers";
var apps = [];
let io;
let utils = require('../wrk/utils');
let oldconfig = undefined;

var loadConfig = function (config) {
    /*for (let s in config.gameservers) {
        let server = config.gameservers[s];
        servers[server.name] = server;
        if (apps[server.name] === undefined) {
            let serverconfig = await readConfig(server.name, server.dir + config.games[server.game].config);
            apps[server.name] = { running: false, child: undefined, starteddate: undefined, logs: [], config: serverconfig};
            apps[server.name].child = new (forever.Monitor)(server.dir + config.games[server.game].filename, {
                cwd: server.dir,
                command: 'bash',
                outFile: config.logsdir + "/" + server.name + ".txt",
                errFile: config.logsdir + "/" + server.name + "_error.txt",
                max: 3,
                silent: true
            });
            apps[server.name].child.on('error', (message) => {
                utils.logError(`Erreur avec le serveur de jeu "${server.name}" est survenue: ${message}`);
            });
            apps[server.name].child.on('exit', () => {
                utils.logInfo(`Serveur de jeu "${server.name}" stoppé.`);
                apps[server.name].running = false;
                io.sockets.in(GAME_SERVERS_ROOM).emit('gs_stop', server.name);
            });
            apps[server.name].child.on('start', () => {
                utils.logInfo(`Serveur de jeu "${server.name}" démarré.`);
                apps[server.name].running = true;
                apps[server.name].starteddate = new Date();
                io.sockets.in(GAME_SERVERS_ROOM).emit('gs_start', server.name, apps[server.name].starteddate);
            });
            apps[server.name].child.on('stdout', line => {
                apps[server.name].logs.push(String(line));
                io.sockets.in(GAME_SERVERS_ROOM).emit('gs_log', server.name, String(line));
            });
            apps[server.name].child.on('stderr', line => {
                apps[server.name].logs.push(String(line));
                io.sockets.in(GAME_SERVERS_ROOM).emit('gs_log', server.name, String(line));
            });
        }
    }*/
    if (oldconfig === undefined) {
        for (let s in config.gameservers) {
            let server = JSON.parse(JSON.stringify(config.gameservers[s])); //Clone de l'objet pour ne pas altérer la config
            server.game = config.games[server.game];
            initServer(config, server);
            apps[server.name].authorizedusers = server.authorizedusers;
        }
    } else {
        for (let s in config.gameservers) {
            let server = JSON.parse(JSON.stringify(config.gameservers[s])); //Clone de l'objet pour ne pas altérer la config
            server.game = config.games[server.game];
            if (apps[server.name] === undefined) {
                initServer(config, server);
            } else {
                for (let os in oldconfig.gameservers) {
                    let oldserver = oldconfig.gameservers[os];
                    oldserver.game = oldconfig.games[oldserver.game];
                    if (server.name === oldserver.name) {
                        if (server.dir !== oldserver.dir || server.game.filename !== oldserver.game.filename) { //Si il y a un changement pas rapport à l'ancienne config on recréé l'app
                            apps[server.name].destroy();
                            apps[server.name] = undefined;
                            initServer(config, server);
                        }
                        break;
                    }
                }
            }
            apps[server.name].authorizedusers = server.authorizedusers;
        }
    }
    oldconfig = config;
    utils.logInfo(`Configuration chargée dans le contrôleur de serveurs de jeu.`);
}

let initServer = async function (config, server) {
    apps[server.name] = new Foreverapp(server.dir + server.game.filename, {
        cwd: server.dir,
        command: 'bash',
        outFile: config.logsdir + "/" + server.name + ".txt",
        errFile: config.logsdir + "/" + server.name + "_error.txt",
        max: 3,
        silent: true
    });
    apps[server.name].onStart = () => { io.sockets.in(GAME_SERVERS_ROOM).emit('gs_start', server.name, apps[server.name].starteddate); };
    apps[server.name].onStop = () => { io.sockets.in(GAME_SERVERS_ROOM).emit('gs_stop', server.name); };
    apps[server.name].onLog = (line) => { io.sockets.in(GAME_SERVERS_ROOM).emit('gs_log', server.name, line) };
    apps[server.name].onErr = (message) => { utils.logError(`Erreur avec le serveur de jeu "${server.name}" est survenue: ${message}`); };
    apps[server.name].configfile = server.dir + server.game.config;
    apps[server.name].config = await readConfig(server.name, apps[server.name].configfile);
}

var init = function (i, socket) {
    io = i;
    socket.on('gs_join', () => {
        utils.logInfo('Socket ajouté dans la room ' + GAME_SERVERS_ROOM);
        socket.join(GAME_SERVERS_ROOM);
    });

    socket.on('gs_start', (server) => {
        checkAuth(socket, server, () => { apps[server].startApp(); });
    });

    socket.on('gs_stop', (server) => {
        checkAuth(socket, server, () => { apps[server].stopApp(); });
    });

    socket.on('gs_status', (server) => {
        checkAuth(socket, server, () => { io.sockets.in(GAME_SERVERS_ROOM).emit('gs_status', server, apps[server].toJSON()) });
    });

    socket.on('gs_setconfig', (server, config) => {
        checkAuth(socket, server, () => {
            let ok = false;
            let filename = apps[server].configfile;
            if (writeConfig(server, filename, config)) {
                ok = true;
                apps[server].config = config;
                apps[server].stopApp();
            }
            socket.emit('notify', ok ? 'success' : 'error', ok ? `Nouvelle configuration pour le serveur ${server} enregistree a ${filename}. Redemarrez le serveur pour appliquer les changements.`
                : `Une erreur est survenue. Impossible de sauvegarder la nouvelle configuration du serveur ${server} a l'emplacement suivant: ${filename}.`);
        }); 
    });
};

var checkAuth = function (socket, server, next) {
    if (socket.user !== undefined && apps[server] !== undefined) {
        if (apps[server].authorizedusers.indexOf(socket.user.id) !== -1) {
            next();
        } else {
            utils.logWarning(`${socket.user.username} a essayé d'atteindre une ressource interdite. (${server})`);
        }
    }
}

var readConfig = async function (server, filename) {
    let config;
    await new Promise((resolve, reject) => {
        fs.readFile(filename, function (err, data) {
            if (err) resolve(false);
            config = String(data);
            resolve(true);
        });
    }).then((ok) => {
        if (ok) {
            utils.logSuccess(`Configuration du serveur ${server} chargée avec succès.`);
        } else {
            config = "Impossible de charger le fichier. Vérifiez la configuration du serveur.";
            utils.logError(`Impossible de charger la configuration ${filename} pour le serveur ${server}. Vérifiez que le fichier soit existant à l'emplacement donné.`)
        }
    });
    return config;
}

var writeConfig = async function (server, filename, config) {
    let retour = false;
    await new Promise((resolve, reject) => {
        fs.writeFile(filename, config, (err) => {
            if (err) resolve(false);
            resolve(true);
        });
    }).then(ok => {
        if (ok) {
            utils.logInfo(`Nouvelle configuration pour le serveur ${server} enregistrée à ${filename}`);
        } else {
            utils.logError(`Une erreur est survenue. Impossible de sauvegarder la nouvelle configuration du serveur ${server} à l'emplacement suivant: ${filename}.`);
        }
        retour = ok;
    });
    return retour;
}

module.exports = { init, loadConfig };
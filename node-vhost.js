var express = require('express');
var cors = require('cors');
var forever = require('forever-monitor');
var jwt = require("jsonwebtoken");
//Controllers
var ctrl = require('./ctrl/ctrl');
var ctrlfv = require('./ctrl/ctrlfv');
var ctrlgs = require('./ctrl/ctrlgs');
var ctrlvm = require('./ctrl/ctrlvm');
var ctrlos = require('./ctrl/ctrlos');
var ctrlproxy = require('./ctrl/ctrlproxy');
var ctrlconfig = require('./ctrl/ctrlconfig');
var utils = require('./wrk/utils');
//App
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile('/public/index.html');
});
const SECRET_KEY = "iojdawseuiuodeawiodfajoideioweajdujhidouwajida";

init();

async function init() {
    utils.logInfo(`Chargement de "node-vhost" version ${ctrl.getVersion()}...`);
    let okconfig = await ctrlconfig.loadConfig();
    if (okconfig) {
        const port = process.argv[2] || 9088;
        const server = app.listen(port, async () => {
            await ctrl.openDB(ctrlconfig.getConfig().credentials.db_dashboard);
            utils.logInfo(`Serveur http en écoute sur le port ${port}`);
        });

        const proxy = new (forever.Monitor)('./proxy-test.js', { max: 3 });
        proxy.on('error', (message) => {
            utils.logError(`Impossible de démarrer le proxy ! ${message}`);
        });
        proxy.on('stderr', (message) => {
            utils.logError(`Une erreur de proxy est survenue : ${message}`);
        });
        proxy.start();

        ctrlfv.loadConfig(ctrlconfig.getConfig());
        ctrlgs.loadConfig(ctrlconfig.getConfig());

        //WebSocket
        var io = require('socket.io').listen(server);
        io.sockets.on('connection', function (socket) {
            socket.on('login', (token) => {
                jwt.verify(token, SECRET_KEY, (err, data) => {
                    utils.logWarning(data.user.username + " est connecté !");
                    socket.user = data.user;
                    ctrlfv.init(io, socket);
                    ctrlgs.init(io, socket);
                    ctrlvm.init(io, socket);
                    ctrlos.init(io, socket);
                    ctrlproxy.init(io, socket, ctrl);
                    ctrlproxy.loadConfig(ctrlconfig.getConfig());
                });
            });
            socket.on('logout', () => {
                utils.logWarning(`${socket.user.username} s'est déconnecté.`)
                delete socket.user;
            });
        });

        function setConfig(config) {
            ctrlfv.loadConfig(config);
            ctrlgs.loadConfig(config);
            ctrlproxy.loadConfig(config);
            return ctrlconfig.setConfig(config);
        };


        //RESTful
        app.get('/api/version', function (req, res) {
            res.status(200).send({ code: 200, version: ctrl.getVersion() });
        });

        app.post('/api/login', function (req, res) {
            var username = req.body.username;
            var password = req.body.password;
            if (checkDefined([username, password])) {
                ctrl.verifyPassword(username, password, ok => {
                    if (ok) {
                        ctrl.getUserByUsername(username, user => {
                            jwt.sign({ user }, SECRET_KEY, (err, token) => {
                                if (err) {
                                    res.status(500).send({ code: 500, message: "Une erreur interne est survenuem. Contactez un administrateur." });
                                } else {
                                    res.json({ code: 200, token, message: "Bienvenue " + username });
                                }
                            });
                        });
                    } else {
                        res.status(401).send({ code: 401, message: "Mot de passe ou nom d'utilisateur incorrect" });
                    }
                });
            } else {
                res.status(401).send({ code: 401, message: "Mot de passe ou nom d'utilisateur incorrect" });
            }
        });

        app.get('/api/config', function (req, res) {
            res.status(200).send({ code: 200, config: ctrlconfig.getConfig() });
        });

        app.post('/api/config', checkAuth, function (req, res) {
            var config = req.body.config;
            if (req.user.admin === 1 && config !== undefined && setConfig(config)) {
                res.status(200).send({ code: 200, message: 'Configuration enregistrée.' });
            } else {
                res.status(500).send({ code: 500, config: getConfig(), message: 'Impossible d\'enregistrer la nouvelle configuration.' });
            }
        });

        app.get('/api/hits', checkAuth, function (req, res) {
            ctrl.getHits(retour => {
                res.status(retour.code).send(retour);
            });
        });

        app.get('/api/hits/:host', checkAuth, function (req, res) {
            ctrl.getHitsByHost(req.params.host, retour => {
                res.status(retour.code).send(retour);
            });
        });

        app.delete('/api/hits/:host', checkAuth, function (req, res) {
            ctrl.deleteHitsByHost(req.params.host, retour => {
                res.status(retour.code).send(retour);
            });
        });

        app.get('/api/:host/visitors', checkAuth, function (req, res) {
            ctrl.getVisitorsByHost(req.params.host, retour => {
                res.status(retour.code).send(retour);
            });
        });

        app.get('/api/:host/visitors/daily', checkAuth, function (req, res) {
            ctrl.getDailyVisitorsByHost(req.params.host, retour => {
                res.status(retour.code).send(retour);
            });
        });

        app.get('/api/:host/visits', checkAuth, function (req, res) {
            ctrl.getVisitsByHost(req.params.host, retour => {
                res.status(retour.code).send(retour);
            });
        });

        app.get('/api/:host/visits/daily', checkAuth, function (req, res) {
            ctrl.getDailyVisitsByHost(req.params.host, retour => {
                res.status(retour.code).send(retour);
            });
        });

        app.get('/api/:host/visits/monthly', checkAuth, function (req, res) {
            ctrl.getMonthlyVisitsByHost(req.params.host, retour => {
                res.status(retour.code).send(retour);
            });
        });

        app.get('/api/:host/visits/url', checkAuth, function (req, res) {
            ctrl.getVisitsByURL(req.params.host, retour => {
                res.status(retour.code).send(retour);
            });
        });

        app.get('/api/users', checkAuth, function (req, res) {
            ctrl.getUsers(req.params.id, retour => {
                res.status(retour.code).send(retour);
            });
        });

        app.get('/api/users/:id', checkAuth, function (req, res) {
            if (req.params.id !== "me") {
                ctrl.getUser(req.params.id, retour => {
                    res.status(retour.code).send(retour);
                });
            } else {
                ctrl.getUser(req.user.id, retour => {
                    res.status(retour.code).send(retour);
                });
            }
        });

        app.post('/api/users', checkAuth, function (req, res) {
            var username = req.body.username;
            var password = req.body.password;
            if (checkDefined([username, password])) {
                ctrl.createUser(req.user, username, password, retour => {
                    res.status(retour.code).send(retour);
                });
            } else {
                res.status(400).send({ code: 400, message: "Paramètre(s) manquant(s)" });
            }
        });

        app.patch('/api/users/me', checkAuth, function (req, res) {
            var username = req.body.username;
            var password = req.body.password;
            ctrl.updateUser(req.user, req.user.id, username, password, retour => {
                res.status(retour.code).send(retour);
            });
        });

        app.delete('/api/users/me', checkAuth, function (req, res) {
            ctrl.deleteUser(req.user, req.user.id, retour => {
                res.status(retour.code).send(retour);
            });
        });

        function checkDefined(mandatories) {
            var ok = true;
            for (var m in mandatories) {
                if (mandatories[m] == undefined) {
                    ok = false;
                }
            }
            return ok;
        }

        function checkAuth(req, res, next) {
            if (!req.headers.authorization || req.headers.authorization.indexOf('Bearer ') === -1) {
                return res.status(401).json({ code: 401, message: 'Missing Authorization Header' });
            }
            var token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, SECRET_KEY, (err, data) => {
                if (err) {
                    res.status(403).send({ code: 403, message: "Accès interdit" });
                } else {
                    req.user = data.user;
                    next();
                }
            });
        }

        app.use(function (req, res, next) {
            res.status(404).send('Erreur 404');
            next();
        });
    } else {
        utils.logError('Impossible de charger l\'application.');
        process.exit(1);
    }
}



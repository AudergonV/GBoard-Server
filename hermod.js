const axios = require('axios');
const bouncy = require('bouncy');
const config = require('./config.json');
const secret = require('./secretconfig.json');
const fs = require('fs');
let socket;

let server = function (req, res, bounce) {
    if (config !== undefined) {
        let notfound = true;
        let ok = false;
        for (h in config.hosts) {
            var host = config.hosts[h];
            if (host.hostname === req.headers.host) {
                ok = true;
            } else if (host.alias.length > 0) {
                for (let a in host.alias) {
                    let alias = host.alias[a];
                    if (alias === req.headers.host) {
                        ok = true;
                        break;
                    }
                }
            }
            if (ok) {
                notfound = false;
                if (!host.devmode) {
                    socket.emit('hit', req.headers, req.connection.remoteAddress, new Date(), host, req.url);
                }
                bounce(host.port);
                break;
            }
        }
        if (notfound) {
            res.statusCode = 404;
            res.end('no such host');
        }
    }
}

//=================
//      HTTPS
//=================
const letsencryptfolder = '/etc/letsencrypt/archive/gwyrin.ch-0001/';
const options = {
    key: fs.readFileSync(letsencryptfolder + 'privkey1.pem'),
    cert: fs.readFileSync(letsencryptfolder + 'fullchain1.pem'),
    ca: [fs.readFileSync(letsencryptfolder + 'chain1.pem')]
};



const serverhttp = bouncy(server);
serverhttp.listen(80);

const serverhttps = bouncy(options, server);
serverhttps.listen(443);

//Connexion à GBoard
setTimeout(() => {
    axios.post(`https://${config.url}/api/login`, {
        username: secret.hermod.username,
        password: secret.hermod.password
    }).then(function (response) {
        if (response.data.code === 200) {
            socket = require('socket.io-client')(`wss://${config.url}`);
            socket.on('connect', function () { socket.emit('login', response.data.token); socket.emit('proxy_join') });
            //socket.on('load_config', c => { config = c });
        } else {
            console.log('Erreur de connexion au GBoard. Vérifiez la configuration');
        }
    }).catch(function (error) {
        console.log('Erreur de connexion au GBoard. Vérifiez la configuration');
    });

}, 2000);




var axios = require('axios');
var bouncy = require('bouncy');
var config = require('./config.json');
var fs = require('fs');
var socket = require('socket.io-client')(`wss://${config.url}`);

/*var server = function (req, res, bounce) {
    if (config !== undefined) {
        let notfound = true;
        let ok = false;
        for (h in config.hosts) {
            var host = config.hosts[h];
            if (host.hostname + ":9090" === req.headers.host) {
                ok = true;
            } else if (host.alias.length > 0) {
                for (let a in host.alias) {
                    let alias = host.alias[a];
                    if (alias + ":9090" === req.headers.host) {
                        ok = true;
                        break;
                    }
                }
            }
            if (ok) {
                notfound = false;
                bounce(host.port);                
                if (!host.devmode) {
                socket.emit('hit', req.headers, req.connection.remoteAddress, new Date(), host, req.url);
                }
                break;
            }
        }
        if (notfound) {
            res.statusCode = 404;
            res.end('no such host');
        }
    }
}*/

var server = function (req, res, bounce) {
    console.log(config);
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
                bounce(host.port);
                if (!host.devmode) {
                    socket.emit('hit', req.headers, req.connection.remoteAddress, new Date(), host, req.url);
                }
                break;
            }
        }
        if (notfound) {
            res.statusCode = 404;
            res.end('no such host');
        }
    }
}



serverhttp = bouncy((req, res, bounce) => { bounce(443) });
serverhttp.listen(80);

socket.on('connect', function () { socket.emit('proxy_join') });
socket.on('load_config', c => { config = c });


//=================
//      HTTPS
//=================
const letsencryptfolder = '/etc/letsencrypt/archive/gwyrin.ch-0001/';
var options = {
    key: fs.readFileSync(letsencryptfolder + 'privkey1.pem'),
    cert: fs.readFileSync(letsencryptfolder + 'fullchain1.pem'),
    ca: [fs.readFileSync(letsencryptfolder + 'chain1.pem')]
};

var serverhttps = bouncy(options, server);
serverhttps.listen(443);



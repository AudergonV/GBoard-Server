const SRV_URL = 'funsui.gwyrin.ch';
var axios = require('axios');
var bouncy = require('bouncy');
var fs = require('fs');
var socket = require('socket.io-client')(`wss://${SRV_URL}`);
var config;
const CONFIG_PATH = 'config.json';


fs.readFile(CONFIG_PATH, function (err, data) {
    if (err) return;
    config = JSON.parse(data);
});

var server = function (req, res, bounce) {
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
}

/*var server = function (req, res, bounce) {
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
}*/



serverhttp = bouncy(server);
serverhttp.listen(9090);

socket.on('connect', function () { socket.emit('proxy_join') });
socket.on('load_config', c => { config = c });


//=================
//      HTTPS
//=================
/*const letsencryptfolder = '/etc/letsencrypt/archive/audergonhome.internet-box.ch/';
var options = {
    key: fs.readFileSync(letsencryptfolder + 'privkey3.pem'),
    cert: fs.readFileSync(letsencryptfolder + 'fullchain3.pem'),
    ca: [fs.readFileSync(letsencryptfolder + 'chain3.pem')]
};

var serverhttps = bouncy(options, server);
serverhttps.listen(443);*/



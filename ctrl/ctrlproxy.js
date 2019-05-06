/*
 * Description   :   Controller des interaction aves le proxy
 * Date          :   25.04.2019
 * Auteur        :   Vincent Audergon
*/
const PROXY_ROOM = "/proxy";
let io;
let ref;
let utils = require('../wrk/utils');

var loadConfig = function (config) {
    io.sockets.in(PROXY_ROOM).emit('load_config', config);
}

var init = function (i, socket, r) {
    io = i;
    ref = r;
    socket.on('proxy_join', () => {
        utils.logInfo('Socket ajouté dans la room ' + PROXY_ROOM);
        socket.join(PROXY_ROOM);
    });
    //Proxy ==> Server
    socket.on('hit', async (metadata, ip, date, host, url) => {
        if (!host.devmode) {
            ref.getBrowser(metadata["user-agent"], async result => {
                let browser;
                if (result.code === 200) {
                    browser = result.browser;
                } else {
                    browser = await getBrowser(metadata['user-agent']);
                    ref.createBrowser(browser, r => { }); // Si le navigateur n'existait pas encore on l'enregistre
                }
                if (host !== undefined) {
                    if (checkUrl(url, host.ignoreddirs)) {
                        let hit = {
                            ip: ip,
                            host: host.hostname,
                            browser: browser,
                            date: date,
                            url: url
                        };
                        //Server ==> Client Vue
                        ref.createHit(hit, res => { });
                        socket.broadcast.emit('hit', hit);
                    }
                }
            });
        }
    });
    utils.logInfo(`Contrôleur du proxy chargé.`);
};

/**
 * Retourne false si l'url cible est un dossier ignoré
 * @param {*} url 
 * @param {*} ignoreddirs 
 */
function checkUrl(url, ignoreddirs) {
    let ok = true;
    for (let d in ignoreddirs) {
        let dir = ignoreddirs[d];
        if (url.indexOf(dir) === 0) {
            if (url.length > dir.length) {
                ok = url.indexOf('/', dir.length - 1) === -1;
            } else {
                ok = false;
            }
        }
    }
    return ok;
}

async function getBrowser(client) {
    try {
        const response = await axios.get('http://useragentstring.com/?uas=' + client + '&getJSON=all');
        let browser = {
            useragent: client,
            name: response.data.agent_name,
            icon: `/images/${response.data.agent_name}.png`,
            os_icon: `/images/${response.data.os_type}.png`,
            os: response.data.os_name
        };
        return browser;
    } catch (error) {
        return { useragent: client, name: 'Indéfini', icon: '/images/unknown.png', os: 'Windows 10', os_icon: '/images/windows.png' };
    }
}

module.exports = { init, loadConfig };
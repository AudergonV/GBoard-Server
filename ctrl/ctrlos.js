/*
 * Description   :   Controller des interaction avec l'os
 * Date          :   16.04.2019
 * Auteur        :   Vincent Audergon
*/
let Info = require('../models/Info');
var osu = require('node-os-utils');
var InfiniteLoop = require('infinite-loop');
const OS_ROOM = "/os";
let io;
let info = new Info();
let utils = require('../wrk/utils');
let il;

var init = function (i, socket) {
    io = i;
    getInfo();

    socket.on('os_join', () => {
        utils.logInfo('Socket ajouté dans la room ' + OS_ROOM);
        socket.join(OS_ROOM);
    });

    socket.on('os_info', () => {
        io.sockets.in(OS_ROOM).emit('os_info', info);
    });
    if (il === undefined) {
        il = new InfiniteLoop();
        il.setInterval(1000);
        il.add(() => { getStats() });
        il.run();
    }
    utils.logInfo(`Contrôleur des informations systèmes chargé.`);
};

var getInfo = function () {
    info.cpu = { count: osu.cpu.count(), model: osu.cpu.model() };
    info.hostname = osu.os.hostname();
    info.upsince = osu.os.uptime();
};

var getStats = async function () {
    info.upsince = osu.os.uptime();
    await osu.mem.info().then(value => { info.memory = value });
    await osu.os.oos().then(value => { info.os = value });
    await osu.drive.info().then(value => { info.disk = value });
    await osu.cpu.usage().then(value => { info.cpu.usage = value });
    await osu.netstat.inOut().then(value => { info.network = value });
    io.sockets.in(OS_ROOM).emit('os_info', info);
};


module.exports = { init };
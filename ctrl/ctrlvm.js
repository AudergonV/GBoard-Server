/*
* Description   :   Controller des interaction avec les VM Virtualbox via socket.io
* Date          :   15.04.2019
* Auteur        :   Vincent Audergon
*/
var virtualbox = require('virtualbox');
const VM_ROOM = "/vm";
let utils = require('../wrk/utils');

var init = function (io, socket) {
    /**
     * Retourne la liste des VMs
     */
    socket.on('vm_getvms', () => {
        checkAuth(socket, () => {
            virtualbox.list(async (vms, error) => {
                if (error) throw error;
                for (let v in vms) {
                    let vm = vms[v];
                    await new Promise(function (resolve, reject) {
                        var options = {
                            vm: vm.name,
                            key: "/VirtualBox/GuestInfo/Net/0/V4/IP"
                        }
                        virtualbox.guestproperty.get(options, (value) => {
                            resolve(value);
                        });
                    }).then(value => {
                        vms[v].ip = value;
                    });
                }
                socket.join(VM_ROOM);
                socket.emit('vm_getvms', vms);
            });
        });
    });

    /**
     * Démarre une VM
     */
    socket.on('vm_start', (name) => {
        checkAuth(socket, () => {
            virtualbox.start(name, true, (error) => {
                if (error) {
                    socket.emit('vm_error', error);
                } else {
                    io.sockets.in(VM_ROOM).emit('vm_start', name);
                }
            });
        });
    });

    /**
     * Stoppe une VM
     */
    socket.on('vm_stop', (name) => {
        checkAuth(socket, () => {
            virtualbox.poweroff(name, (error) => {
                if (error) {
                    socket.emit('vm_error', error);
                } else {
                    io.sockets.in(VM_ROOM).emit('vm_stop', name);
                }
            });
        });
    });
    utils.logInfo(`Contrôleur des VMs chargé.`);
};

let checkAuth = function (socket, next) {
    if (socket.user.admin === 1) {
        next();
    } else {
        utils.logWarning(`${socket.user.username} a essayé d'acceder à une ressource interdite (VMs)`);
    }
}

module.exports = { init };
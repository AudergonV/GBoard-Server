var forever = require('forever-monitor');

function Foreverapp(file, options) {
    this.running = false;
    this.child = undefined;
    this.starteddate = undefined;
    this.logs = [];
    this.config = "";
    this.running = false;
    this.authorizedusers = [];
    this.initChild(file, options);
}

Foreverapp.prototype.initChild = function (file, options) {
    this.child = new (forever.Monitor)(file, options);
    this.child.on('error', (message) => {
        this.onErr(message);
    });
    this.child.on('exit', () => {
        this.running = false;
        this.onStop();
    });
    this.child.on('start', () => {
        this.running = true;
        this.starteddate = new Date();
        this.onStart();
    });
    this.child.on('stdout', line => {
        this.logs.push(String(line));
        this.onLog(String(line));
    });
    this.child.on('stderr', line => {
        this.logs.push(String(line));
        this.onLog(String(line));
    });
}

Foreverapp.prototype.destroy = function () {
    this.stopApp();
    this.child = false;
}

Foreverapp.prototype.onStart = function () {

}

Foreverapp.prototype.onStop = function () {

}

Foreverapp.prototype.onErr = function () {

}

Foreverapp.prototype.onLog = function () {

}

Foreverapp.prototype.startApp = function () {
    if (this.child !== undefined) {
        this.child.start();
    }
}

Foreverapp.prototype.stopApp = function () {
    if (this.child !== undefined) {
        this.child.stop();
    }
}

Foreverapp.prototype.toJSON = function(){
    return {
        running: this.running,
        starteddate: this.starteddate,
        logs: this.logs,
        config: this.config
    }
}

module.exports = Foreverapp;
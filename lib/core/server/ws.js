const Logger = require('../../util/logger');

const ws = require('ws');


class Wsserver {

    constructor(options) {
        this.logger = Logger.createLogger({prefix: options.prefix, silent: options.silent, level: options.level});
    }

    connection(socket) {
        this.socket = socket;
        this.callback('connection', socket);
        socket.on('message', (message) => {
            console.log('received message::', message);
        });
    }

    close() {
        this.callback('close');
        this.logger.debug('ws关闭');
    }

    error(error) {
        this.callback('error', error);
        this.logger.error('ws出错：', error);
    }

    start(server, callback) {
        this.callback = callback || function(){};
        this.server = new ws.Server({server: server});
        this.server.on('connection', this.connection.bind(this));
        this.server.on('close', this.close.bind(this));
        this.server.on('error', this.error.bind(this));
    }

    refresh() {
        if(this.socket) {
            this.socket.send('refresh');
        }
    }
}


module.exports = Wsserver;

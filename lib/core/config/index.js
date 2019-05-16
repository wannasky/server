const path = require('path');
const fileUtil = require('../../util/fileUtil');

const filename = 'wserver.config.js';

const config = (commander)=> {
    const cwd = process.cwd();
    let configFile = commander.config ? commander.config : filename;
    let config = {
        root: './',
        port: 8989,
        memory: false,
        router: {},
        proxy: {}
    };
    if(fileUtil.exist(configFile)){
        let cf = require(path.join(cwd, configFile));
        ['root', 'port', 'memory', 'router', 'proxy', 'liveReload', 'entry'].forEach(item => {
            if(cf[item] !== undefined) {
                config[item] = cf[item];
            }
        });
    }

    if(commander.memory !== undefined) {
        config.memory = commander.memory !== 'false';
    }

    return config;
}


module.exports = config;

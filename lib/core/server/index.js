const corser = require('corser');
const httpProxy = require('http-proxy');
const union = require('union');
const bodyParser = require('body-parser');
const Logger = require('../../util/logger');

require('./response');

class HttpServer {

    constructor(options) {
        this.logger = Logger.createLogger({prefix: options.prefix, silent: options.silent, level: options.level});
        this.before = [];
        this.port = options.port;
        this.root = options.root;
        this.ssl = options.ssl;
        this.memory = options.memory;
        this.proxy = options.proxy;
        this.router = options.router;
        this.cache = options.cache === undefined ? 0 : options.cache;
        this.headers = options.headers || {};
        this.cors = !!options.cors;
        if (this.cors) {
            this.headers['Access-Control-Allow-Origin'] = '*';
            this.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Range';
            this.before.push(corser.create(null));
        }
        this.parserBody();
        this.pipeProxy();
        this.pipeRouter();
        this.pipeStatic();
        this.startup();
    }

    parserBody() {
        const jsonParser = bodyParser.json();
        const urlParser = bodyParser.urlencoded({extended: false});
        this.before.push((req, res) => {
            let contentType = req.headers['content-type'];
            if (contentType) {
                if (contentType.indexOf('application/json') !== -1) {
                    jsonParser(req, res, () => {
                    });
                } else if (contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
                    urlParser(req, res, () => {
                    });
                }
            }
            res.emit('next');
        });
    }

    pipeProxy() {
        if (!this.proxy) return;
        const proxyServer = httpProxy.createProxyServer({});
        proxyServer.on('error', error => {
            this.logger.error('代理出错：', error);
        });
        this.before.push((req, res) => {
            let match = matchKey(proxy, req.url);
            let value = match ? match.value : false;
            if (value && isHighWeight(req.url, req.method, match, this.router)) {
                try {
                    if (isString(value) && isUrl(value)) {
                        proxyServer.web(req, res, {target: value, secure: false});
                        logger.log('代理匹配', `${req.url} => ${value}`);
                    } else if (isObject(value) && value.target && isString(value.target)) {
                        proxyServer.web(req, res, Object.assign({}, {secure: false}, value));
                        logger.log('代理匹配', `${req.url} => ${value.target}`);
                    } else {
                        logger.error('代理配置不正确，请阅读README.md');
                        process.exit();
                    }
                } catch (error) {
                    logger.error(error.message);
                }
            } else {
                res.emit('next');
            }
        });
    }

    pipeRouter() {
        if (!this.router) return;
        this.before.push((req, res) => {
            let {key, value, param} = routerMatch(this.router, req.url);
            if (key) {
                const method = req.method.toLowerCase();
                if (value.hasOwnProperty(method)) {
                    req.on('end', () => {
                        res.statusCode = 200;
                        if (method === 'get' || method === 'delete') {
                            value[method](req, res, param);
                        } else if (method === 'post' || method === 'put') {
                            value[method](req, res, Object.assign({}, param, req.body));
                        }
                        logger.debug('路由匹配成功', key, req.method.toLowerCase());
                    });
                } else {
                    res.emit('next');
                }
            } else {
                res.emit('next');
            }
        });
    }

    pipeStatic() {
        this.before.push((req, res) => {
            let url = req.url;
            url = url === '/' ? '/index.html' : url;
            res.renderUrl(path.join(this.root, url), this.memory);
        });
    }

    startup() {
        let options = {
            before: this.before,
            buffer: false,
            headers: this.headers,
            onError: (error, req, res) => {
                logger.error(req.url, error.message);
                res.end();
            }
        }
        if (this.ssl) {
            options.https = this.ssl;
        }

        this.server = union.createServer(options);
    }

    listen() {
        this.server.listen.apply(this.server, arguments);
    }

    close() {
        return this.server.close();
    }
}

const matchKey = (object, string) => {
    let result;
    const keys = Object.keys(object);
    let _len = 0;
    for (let i = 0, l = keys.length; i < l; i++) {
        let regexp = createRegExp(keys[i]);
        let match = string.match(regexp);
        if (match) {
            if (keys[i].length > _len) {
                result = {key: keys[i], value: object[keys[i]]};
                _len = keys[i].length;
            }
        }
    }
    return result;
}

const isString = (string) => {
    return Object.prototype.toString.call(string) === '[object String]';
}

const isObject = (object) => {
    return Object.prototype.toString.call(object) === '[object Object]';
}

const isUrl = (string) => {
    return /^(http:|https:)+/.test(string);
}

const generateRegexpExtend = (rule) => {
    if (rule.indexOf('/') === 0) {
        rule = rule.slice(1);
    }
    if (rule.lastIndexOf('/') === (rule.length - 1)) {
        rule = rule.slice(0, -1);
    }
    let regexp = '';
    let param = {};
    let sindex = 0;
    rule.split('/').forEach(item => {
        if (item.indexOf(':') === 0) {
            param[++sindex] = item.slice(1);
            regexp = regexp + '/(\[^/]+)';
        } else {
            regexp = regexp + '/' + item;
        }
    });
    regexp = new RegExp(regexp);
    return {
        regexp,
        param
    };
}

const routerMatch = (router, url) => {
    let result = {};
    const keys = Object.keys(router);
    for (let i = 0, l = keys.length; i < l; i++) {
        let {regexp, param} = generateRegexpExtend(keys[i]);
        let match = url.match(regexp);
        if (match) {
            result.key = keys[i];
            result.value = router[keys[i]];
            let params = {};
            for (let key in param) {
                params[param[key]] = match[key];
            }
            result.param = params;
            break;
        }
    }
    return result;
}

const isHighWeight = function (url, method, proxy, router) {
    if (!proxy) return false;
    if (!router) return true;
    let {key, value} = routerMatch(router, url);
    if (!key) return true;
    if (!value.hasOwnProperty(method.toLowerCase())) return true;
    let proxyLen = path.normalize(proxy.key).replace(/\\/g, '/').match(/^\/?([\s\S]+?)\/?$/)[1].split('/').length;
    let routeLen = path.normalize(key).replace(/\\/g, '/').match(/^\/?([\s\S]+?)\/?$/)[1].split('/').length;
    if (routeLen >= proxyLen) return false;
    return true;
}

const server = (config) => {
    let httpServer = new HttpServer(config);
    httpServer.listen(httpServer.port, () => {
        httpServer.logger.success('服务器启动成功,端口号：', httpServer.port);
    });
};


module.exports = server;

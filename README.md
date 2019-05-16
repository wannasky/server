# @wannasky/server

node服务器，支持代理，路由等功能

## 配置

新建`wserver.config.js`(默认)用于配置服务器相关参数

```javascript

module.exports = {

    root: './',     // 服务器根目录

    port: 8989,     // 端口号
    
    memory: false,  // 静态资源是否从内存读取，memory-fs ，默认 false
    
    liveReload: false, //是否文件变化(root下），自动刷新，memory模式下不生效

    proxy: {
        '/api/one': {
            target: 'https://one.dyn.com',
            headers: {
                host: 'xxx'
            }
        },
        '/api/two': 'https://two.dyn.com'
    },

    router: {
        
        // get post put delete 等
        '/account/:user': {
            
            get: (req, res, query) => {
                res.json({
                    message: 'success',
                    info: {
                        name: query
                    }
                });
            },
            
            post: (req, res) => {
                res.json({
                    message: 'success'
                });
            }
        }
        
    }
}

```


## 使用

运行 `wserver`即可

自定义配置文件 `wserver -c custom.config.js`



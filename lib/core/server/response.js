/**
 * 扩展response
 */

const union = require('union');
const fs = require('fs');
const path = require('path');
const mime = require('mime');

//renderUrl
union.ResponseStream.prototype.renderUrl = function (url, memory = false, mfs = null) {
    let query = url.indexOf('?');
    if(query !== -1) url = url.slice(0,query);
    this.setHeader('Content-Type',mime.getType(url) + '; charset=utf-8');
    try{
        this.statusCode = 200;
        this.end((memory && mfs) ? mfs.readFileSync(path.resolve(url)) : fs.readFileSync(path.resolve(url)));
    }catch (e){
        this.statusCode = 400;
    }finally {
        this.end();
    }
}

union.ResponseStream.prototype.renderCodeAsHtml = function(code){
    this.setHeader('Content-Type', 'text/html; charset=utf-8');
    this.statusCode = 200;
    this.end(code);
}

union.ResponseStream.prototype.next = function () {
    this.emit('next');
}

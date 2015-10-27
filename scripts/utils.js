// utils.js
/* 
 *  Copyright (c) 2014 James Leigh, Some Rights Reserved
 * 
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are met:
 * 
 *  1. Redistributions of source code must retain the above copyright notice,
 *  this list of conditions and the following disclaimer.
 * 
 *  2. Redistributions in binary form must reproduce the above copyright
 *  notice, this list of conditions and the following disclaimer in the
 *  documentation and/or other materials provided with the distribution.
 * 
 *  3. Neither the name of the copyright holder nor the names of its
 *  contributors may be used to endorse or promote products derived from this
 *  software without specific prior written permission.
 * 
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 *  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 *  ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 *  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 *  CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 *  SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 *  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 *  CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

"use strict";

function parseCSV(text) {
    if (!text) return [];
    return text.split(/\r?\n/).map(function(line) {
        if (line.indexOf(',') < 0) return [line];
        var m;
        var row = [];
        var regex = /(?:,|^)(?:"([^"]*)"|([^",]*))/g;
        if (line.charAt(0) == ',') {
            row.push('');
        }
        while (m = regex.exec(line)) {
            var string = m[1] || m[2] || '';
            row.push(string.trim());
        }
        return row;
    });
}

function rows2objects(rows) {
    var headers = [];
    return rows.reduce(function(points, row){
        if (headers.length && headers.length == row.length) {
            points.push(object(headers, row));
        } else {
            headers = row;
        }
        return points;
    }, []);
}

function clearCache(indexedDB, name) {
    return openCacheDatabase(indexedDB, name).then(function(db){
        db.transaction(['cache']).objectStore('cache').clear();
    });
}

function cache(indexedDB, name, maxage, func) {
    return function(key) {
        var args = arguments;
        var now = Date.now();
        return readCacheEntry(indexedDB, name, key).then(function(entry){
            if (entry && entry.asof > now - maxage) {
                if (entry.hasOwnProperty('resolved'))
                    return entry.resolved;
                return Promise.reject(entry.rejected);
            }
            return Promise.resolve(func.apply(this, args)).then(function(resolved){
                return writeCacheEntry(indexedDB, name, {
                    key: key,
                    asof: now,
                    resolved: resolved
                }).then(function(){
                    return resolved;
                });
            }, function(rejected){
                return writeCacheEntry(indexedDB, name, {
                    key: key,
                    asof: now,
                    rejected: rejected
                }).then(function(){
                    return Promise.reject(rejected);
                });
            });
        });
    };
}

function readCacheEntry(indexedDB, name, key) {
    return new Promise(function(resolve, reject){
        return openCacheDatabase(indexedDB, name).then(function(db){
            var store = db.transaction(['cache']).objectStore('cache');
            var request = store.get(key);
            request.onsuccess = resolve;
            request.onerror = reject;
        });
    }).then(function(event){
        return event.target.result;
    });
}

function writeCacheEntry(indexedDB, name, entry) {
    return new Promise(function(resolve, reject){
        return openCacheDatabase(indexedDB, name).then(function(db){
            var store = db.transaction(['cache'], "readwrite").objectStore('cache');
            var request = store.put(entry);
            request.onsuccess = resolve;
            request.onerror = reject;
        });
    });
}

function openCacheDatabase(indexedDB, name) {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open(name);
        request.onsuccess = resolve;
        request.onerror = reject;
        request.onupgradeneeded = function(event) {
            var db = event.target.result;
            db.createObjectStore('cache', {keyPath:'key'});
        };
    }).then(function(event){
        return event.target.result;
    });
}

function synchronized(func) {
    var promise = Promise.resolve();
    return function(/* arguments */) {
        var context = this;
        var args = arguments;
        return promise = promise.catch(function() {
            // ignore previous error
        }).then(function() {
            return func.apply(context, args);
        });
    };
}

function memoize(func) {
    var memo = {};
    return function(key) {
        return memo[key] ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
}

function object(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
        if (values) {
            result[list[i]] = values[i];
        } else {
            result[list[i][0]] = list[i][1];
        }
    }
    return result;
}

function promiseBinaryString(url) {
    return new Promise(function(resolve, reject) {
        console.log(url);
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 203)) {
                resolve(xhr.responseText);
            } else if (xhr.readyState == 4) {
                reject({status: xhr.statusText, message: titleOf(xhr.responseText, xhr.statusText), url: url});
            }
        };
        xhr.open("GET", url, true);
        xhr.overrideMimeType('text\/plain; charset=x-user-defined');
        xhr.send();
    });
}

function promiseText(url) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 203)) {
                resolve(xhr.responseText);
            } else if (xhr.readyState == 4) {
                reject({status: xhr.statusText, statusCode: xhr.status, message: titleOf(xhr.responseText, xhr.statusText), url: url});
            }
        };
        xhr.open("GET", url, true);
        xhr.send();
    });
}

function titleOf(html, status) {
    var lower = html.toLowerCase();
    var start = lower.indexOf('<title');
    var end = lower.indexOf('</title>');
    if (start < 0 || end < 0) return status;
    var text = html.substring(html.indexOf('>', start) + 1, end);
    var decoded = text.replace('&lt;','<').replace('&gt;', '>').replace('&amp;', '&');
    if (decoded.indexOf(status) >= 0) return decoded;
    else return decoded + ' ' + status;
}

function handle(handler, event){
    var data = _.isObject(event.data) ? event.data : event.data ? {cmd: event.data} : toJSONObject(event);
    var resolve = _.compose(
        self.postMessage.bind(self),
        _.extend.bind(_, _.omit(data, 'points', 'result'))
    );
    if (typeof data.cmd == 'string' && typeof handler[data.cmd] == 'function') {
        Promise.resolve(data).then(handler[data.cmd]).then(function(result){
            if (_.isObject(result) && result.status && _.isObject(event.data)) {
                resolve(result);
            } else if (result !== undefined) {
                resolve({status: 'success', result: result});
            }
        }).catch(function(error) {
            if (error.status != 'error' || error.message) {
                console.log(error);
            }
            return Promise.reject(normalizedError(error));
        }).catch(function(error){
            resolve(error);
        });
    } else if (event.ports && event.ports.length) {
        console.log('Unknown command ' + data.cmd);
        resolve({
            status: 'error',
            message: 'Unknown command ' + data.cmd
        });
    } else if (event.data) {
        console.log(event.data);
    } else {
        console.log(event);
    }
}

function combineResult(results){
    if (_.isEmpty(results)) return {status: 'error', result: [], message: "no results"};
    var errors = results.filter(function(result) {
        return 'success' != result.status;
    });
    return _.reduce(results, function(memo, msg) {
        var result = msg.result ? memo.result.concat(msg.result) : memo.result;
        return _.extend(memo, msg, {
            status: memo.status != msg.status ? 'warning' : memo.status,
            result: result,
            message: memo.message,
            quote: memo.quote
        });
    }, {
        status: results[0].status,
        result: [],
        message: _.compact(_.uniq(_.flatten(_.pluck(results, 'message')).sort(), true)) || undefined,
        quote: _.isEmpty(errors) ? undefined : _.uniq(_.flatten(_.pluck(errors, 'quote')), false, function(quote){
            return JSON.stringify(quote);
        })
    });
}

function rejectNormalizedError(error) {
    if (error.status != 'error' || error.message) {
        console.log(error);
    }
    return Promise.reject(normalizedError(error));
}

function normalizedError(error) {
    if (error && error.status && error.status != 'success') {
        return error;
    } else if (error.code || error.reason){ // WebSocket CloseEvent
        return _.extend({
            status: 'error',
            code: error.code,
            message: error.reason || 'WebSocket error',
            wasClean: error.wasClean
        }, toJSONObject(error));
    } else if (error.target && error.target.errorCode){
        return _.extend({
            status: 'error',
            errorCode: error.target.errorCode
        }, toJSONObject(error));
    } else if (error.message && error.stack) {
        return _.extend({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, toJSONObject(error));
    } else if (error.message) {
        return _.extend({
            status: 'error'
        }, toJSONObject(error));
    } else if (error.srcElement && error.srcElement.error && error.srcElement.error.message) {
        return {
            status: 'error',
            message: error.srcElement.error.message,
            name: error.srcElement.transaction && error.srcElement.transaction.db && error.srcElement.transaction.db.name
        };
    } else if (error.target && error.target.transaction && error.target.transaction.error && error.target.transaction.error.message) {
        return {
            status: 'error',
            message: error.target.transaction.error.message,
            name: error.target.transaction.db && error.target.transaction.db.name
        };
    } else {
        console.log("Unknown error type", error);
        return {
            status: 'error',
            message: JSON.stringify(toJSONObject(error))
        };
    }
}

function toJSONObject(value, omitObjects) {
    var omit = omitObjects || [];
    var type = typeof value;
    var obj = value && type === 'object';
    if (obj && omit.indexOf(value) >= 0) {
        return undefined;
    } else if (obj) {
        omit.push(value);
    }
    if (type === 'string' || type === 'number' || type === 'null' || !value && type === 'object') {
        return value;
    } else if (obj && typeof value.toJSON === 'function') {
        return value;
    } else if (Object.prototype.toString.apply(value) === '[object Array]') {
        var array = new Array(value.length);
        for (var i=0; i<value.length; i++) {
            array[i] = toJSONObject(value[i], omit);
        }
        return array;
    } else if (obj) {
        var object = {};
        for (var k in value) {
            if (k == 'prototype') continue;
            var json = toJSONObject(value[k], omit);
            if (json !== undefined) {
                object[k] = json;
            }
        }
        return object;
    } else {
        return undefined;
    }
}

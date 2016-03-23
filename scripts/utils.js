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
    return _.compact(text.split(/\r?\n/)).map(function(line) {
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
            points.push(_.object(headers, row));
        } else {
            headers = row;
        }
        return points;
    }, []);
}

function clearCache(name) {
    return openCacheDatabase(name, 'readwrite', function(store, resolve, reject){
        var request = store.clear();
        request.onsuccess = resolve;
        request.onerror = reject;
    });
}

function cache(name, func, maxage) {
    return function(key) {
        var args = arguments;
        var now = Date.now();
        var expires = now + (maxage || 60 * 60 * 1000);
        return readCacheEntry(name, key).then(function(entry){
            if (entry && entry.expires > now) {
                if (entry.hasOwnProperty('resolved'))
                    return entry.resolved;
                return Promise.reject(entry.rejected);
            }
            return Promise.resolve(func.apply(this, args)).then(function(resolved){
                return writeCacheEntry(name, {
                    key: key,
                    asof: now,
                    expires: expires,
                    resolved: resolved
                }).then(function(){
                    return resolved;
                });
            }, function(rejected){
                return writeCacheEntry(name, {
                    key: key,
                    asof: now,
                    expires: expires,
                    rejected: rejected instanceof Error ? rejected.message : rejected
                }).then(function(){
                    return Promise.reject(rejected);
                });
            });
        });
    };
}

function readCacheEntry(name, key) {
    return openCacheDatabase(name, 'readonly', function(store, resolve, reject){
        var request = store.get(key);
        request.onsuccess = resolve;
        request.onerror = reject;
    }).then(function(event){
        return event.target.result;
    });
}

function writeCacheEntry(name, entry) {
    return openCacheDatabase(name, 'readwrite', function(store, resolve, reject){
        var request = store.put(entry);
        request.onerror = reject;
        request.onsuccess = function(){
            var index = store.index('expires');
            var cursor = index.openCursor();
            cursor.onerror = reject;
            cursor.onsuccess = function(event){
                var cursor = event.target.result;
                if (cursor && cursor.value.expires < entry.asof) {
                    var request = store.delete(cursor.value.key);
                    request.onerror = reject;
                    request.onsuccess = resolve;
                } else {
                    resolve();
                }
            };
        };
    });
}

function openCacheDatabase(name, mode, callback) {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open(name, 4);
        request.onupgradeneeded = function(event) {
            var db = event.target.result;
            // Clear the database to re-download everything
            if (db.objectStoreNames.contains('cache')) {
                db.deleteObjectStore('cache');
            }
            var store = db.createObjectStore('cache', {keyPath:'key'});
            store.createIndex("expires", "expires", {unique: false});
        };
        request.onerror = reject;
        request.onsuccess = function(event) {
            try {
                var db = event.target.result;
                var trans = db.transaction('cache', mode);
                return callback(trans.objectStore('cache'), resolve, reject);
            } catch(e) {
                reject(e);
            }
        };
    });
}

function throttlePromise(fn, limit) {
    var max = limit || 1;
    var currently = 0;
    var queue = [];
    var next = function(){
        if (currently < max && queue.length) {
            currently++;
            queue.shift().call();
        }
    };
    return function(/* arguments */) {
        var context = this;
        var args = arguments;
        return new Promise(function(callback){
            queue.push(callback);
            next();
        }).then(function(){
            return fn.apply(context, args);
        }).then(function(result){
            currently--;
            next();
            return result;
        }, function(error){
            currently--;
            next();
            return Promise.reject(error);
        });
    };
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
    var id = data.id;
    if (typeof data.cmd == 'string' && typeof handler[data.cmd] == 'function') {
        Promise.resolve(data).then(handler[data.cmd]).then(function(result){
            if (_.isObject(result) && result.status && _.isObject(event.data)) {
                return result;
            } else if (result !== undefined) {
                return {status: 'success', result: result};
            }
        }).catch(function(error) {
            if (error.status != 'error' || error.message) {
                console.error(error);
            }
            return normalizedError(error);
        }).then(function(result){
            if (id) return _.extend(result, {id: id});
            else return result;
        }).then(function(result){
            self.postMessage(result);
        });
    } else if (event.ports && event.ports.length) {
        console.error('Unknown command ' + data.cmd);
        self.postMessage(_.extend({
            id: id,
            status: 'error',
            message: 'Unknown command ' + data.cmd
        }, _.omit(data, 'points', 'result')));
    } else if (event.data) {
        console.warn(event.data);
    } else {
        console.warn(event);
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
        quote: _.isEmpty(errors) ? undefined : _.uniq(_.compact(_.flatten(_.pluck(errors, 'quote'))), false, function(quote){
            return JSON.stringify(quote);
        })
    });
}

function rejectNormalizedError(error) {
    if (error.status != 'error' || error.message) {
        console.warn(error);
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
        console.error("Unknown error type", error);
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

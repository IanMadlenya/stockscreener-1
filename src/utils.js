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

function cache(indexedDB, name, func) {
    return function(key) {
        var args = arguments;
        var now = Date.now();
        return readCacheEntry(indexedDB, name, key).then(function(entry){
            if (entry.asof > now - 11 * 24 * 60 * 60 * 1000)
                return entry.value;
            return Promise.reject();
        }).catch(function(){
            return Promise.resolve(func.apply(this, args)).then(function(value){
                return writeCacheEntry(indexedDB, name, {
                    url: key,
                    asof: now,
                    value: value
                }).then(function(){
                    return value;
                });
            });
        });
    };
}

function readCacheEntry(indexedDB, name, url) {
    return new Promise(function(resolve, reject){
        return openCacheDatabase(indexedDB, name).then(function(db){
            var store = db.transaction(['cache']).objectStore('cache');
            var request = store.get(url);
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
            db.createObjectStore('cache', {keyPath: "url"});
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
                reject({status: xhr.statusText, message: xhr.responseText, url: url});
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
                reject({status: xhr.statusText, message: xhr.responseText, url: url});
            }
        };
        xhr.open("GET", url, true);
        xhr.send();
    });
}

function dispatch(handler, event){
    var cmd = event.data.cmd || event.data;
    if (typeof cmd == 'string' && typeof handler[cmd] == 'function') {
        Promise.resolve(event).then(handler[cmd]).then(function(result){
            if (result !== undefined) {
                event.ports[0].postMessage(result);
            }
        }).catch(rejectNormalizedError).catch(function(error){
            event.ports[0].postMessage(error);
        });
    } else if (event.ports && event.ports.length) {
        console.log('Unknown command ' + cmd);
        event.ports[0].postMessage({
            status: 'error',
            message: 'Unknown command ' + cmd
        });
    } else {
        console.log(event.data);
    }
}

function rejectNormalizedError(error) {
    if (error.status != 'error' || error.message) {
        console.log(error);
    }
    if (error && error.status == 'error') {
        return Promise.reject(error);
    } else if (error.target && error.target.errorCode){
        return Promise.reject({
            status: 'error',
            errorCode: error.target.errorCode
        });
    } else if (error.message && error.stack) {
        return Promise.reject({
            status: 'error',
            message: error.message,
            stack: error.stack
        });
    } else if (error.message) {
        return Promise.reject({
            status: 'error',
            message: error.message
        });
    } else {
        return Promise.reject({
            status: 'error',
            message: error
        });
    }
}

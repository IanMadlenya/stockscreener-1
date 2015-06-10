// background.js
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

var services = {list: [], quote: [], mentat: []};

function dispatch(handler) {
    var port = 1880;
    var homepage_url = "http://probabilitytrading.net/";
    var extensionTypes = {
        'css': 'text/css',
        'html': 'text/html',
        'htm': 'text/html',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'js': 'text/javascript',
        'png': 'image/png',
        'svg': 'image/svg+xml',
        'txt': 'text/plain'
    };
    chrome.app.runtime.onLaunched.addListener(function(){
        window.open("http://localhost:" + port + "/");
    });
    initialize();
    chrome.runtime.onSuspend.addListener(function() {
        _.flatten(_.toArray(services)).forEach(function(worker) {
            worker.port.postMessage("stop");
        });
        services = {list: [], quote: [], mentat: []};
    });
    chrome.runtime.onSuspendCanceled.addListener(initialize);

    function initialize() {
        _.map(createWorkers(), function(workers, service) {
            _.map(workers, function(worker) {
                worker.promiseMessage("start").then(function(){
                    if (!services[service]) services[service] = [];
                    services[service].push(worker);
                }, function(error) {
                    console.log(error);
                });
            })
        });
        var server = new http.Server();
        var wsServer = new http.WebSocketServer(server);
        server.listen(port);
        server.addEventListener('request', function(req) {
            if (req.headers.url == '/') {
                var host = req.headers.host || ('localhost:' + port);
                req.writeHead(302, {
                    'Location': homepage_url + '#app=http://' + host + '/'
                });
                req.end();
            } else {
                var url;
                if (req.headers.url.indexOf('?') > 0) {
                    url  = req.headers.url.substr(0, req.headers.url.indexOf('?'));
                } else {
                    url  = req.headers.url;
                }
                var xhr = new XMLHttpRequest();
                xhr.onloadend = function() {
                  var type = 'text/plain';
                  if (this.getResponseHeader('Content-Type')) {
                    type = this.getResponseHeader('Content-Type');
                  } else if (url.indexOf('.') != -1) {
                    var extension = url.substr(url.lastIndexOf('.') + 1);
                    type = extensionTypes[extension] || type;
                  }
                  console.log('Served ' + url);
                  var contentLength = this.getResponseHeader('Content-Length');
                  if (xhr.status == 200)
                    contentLength = (this.response && this.response.byteLength) || 0;
                  req.writeHead(this.status, {
                    'Content-Type': type,
                    'Content-Length': contentLength});
                  req.end(this.response);
                };
                xhr.open('GET', url, true);
                xhr.responseType = 'arraybuffer';
                xhr.send();
            }
            return true;
        });

        wsServer.addEventListener('request', function(req) {
            console.log('Client connected');
            var socket = req.accept();
            var buffer = '';
            socket.addEventListener('message', function(event) {
                buffer = buffer ? buffer + event.data : event.data;
                while (buffer.indexOf('\n\n') > 0) {
                    var idx = buffer.indexOf('\n\n') + 2;
                    var json = buffer.substring(0, idx);
                    buffer = buffer.substring(idx);
                    Promise.resolve(json).then(JSON.parse.bind(JSON)).then(function(data) {
                        return _.isObject(data) ? data : {cmd: data};
                    }).then(function(data){
                        return Promise.resolve(data).then(function(data) {
                            if (typeof data.cmd == 'string') {
                                return data;
                            } else {
                                throw Error("Unknown message: " + data);
                            }
                        }).then(function(data){
                            if (typeof handler[data.cmd] == 'function') {
                                return handler[data.cmd](data);
                            } else {
                                throw Error("Unknown command: " + data.cmd);
                            }
                        }).then(function(result){
                            if (_.isObject(result) && result.status) {
                                return result;
                            } else if (result !== undefined) {
                                return {status: 'success', result: result};
                            }
                        }).catch(function(error){
                            if (error.status != 'error' || error.message) {
                                console.log(error);
                            }
                            return normalizedError(error);
                        }).then(function(result){
                            return _.extend(_.omit(data, 'points', 'result'), result);
                        }).then(function(result){
                            socket.send(JSON.stringify(result) + '\n\n');
                        });
                    }).catch(function(error){
                        console.log(error);
                        socket.send(JSON.stringify(normalizedError(error)) + '\n\n');
                    });
                }
            });
            socket.addEventListener('close', function() {
                console.log('Client disconnected');
            });
            return true;
        });
    }

    function createWorkers() {
        return {
            list: [
                createWorker('list', 'nasdaq-list', 'scripts/nasdaq-list.js')
            ],
            quote: [
                createWorker('quote', 'yahoo-quote', 'scripts/yahoo-quote.js'),
                createWorker('quote', 'morningstar-financials', 'scripts/morningstar-financials.js')
            ],
            mentat: _.range(17).map(function(index){
                return createWorker('mentat', 'mentat' + index, 'scripts/mentat.js');
            })
        };
    }

    function createWorker(service, name, script) {
        var outstandingCounter = 1;
        var outstandingCommands = {};
        var port = new Worker(script);
        port.onmessage = handleResponse;
        port.onerror = handleResponse;
        return {
            service: service,
            name: name,
            script: script,
            port: port,
            promiseMessage: function(data) {
                var id = data.id && data.id < outstandingCounter && !outstandingCommands[data.id] ? data.id : ++outstandingCounter;
                var timeout;
                return new Promise(function(resolve, reject){
                    timeout = setTimeout(function(){
                        console.log("Still waiting on " + name + " for a response to", data);
                        timeout = setTimeout(function(){
                            console.log("Aborting " + name + " response to", data);
                            reject(_.extend({}, data, {status: 'error', message: "Service took too long to respond"}));
                        }, 60000);
                    }, 60000);
                    outstandingCommands[id] = {
                        service: service,
                        name: name,
                        script: script,
                        id: data.id,
                        resolve: resolve,
                        reject: reject
                    };
                    var msg = _.extend(_.isObject(data) ? data : {cmd: data}, {id: id});
                    port.postMessage(msg);
                }).then(function(resolved) {
                    delete outstandingCommands[id];
                    clearTimeout(timeout);
                    return resolved;
                }, function(rejected) {
                    delete outstandingCommands[id];
                    clearTimeout(timeout);
                    return Promise.reject(rejected);
                });
            }
        };

        function handleResponse(event) {
            var data = event.data;
            var id = data && data.id;
            var pending = outstandingCommands[id];
            if (pending.id !== undefined) {
                // restore client id
                data.id = pending.id;
            }
            if (id && pending) {
                if (!data || data.status == 'success' || data.status === undefined) {
                    pending.resolve(data);
                } else {
                    pending.reject(data);
                }
            } else if (id) {
                console.log("Unknown worker response", event);
            } else {
                // worker error
                _.each(outstandingCommands, function(pending, id) {
                    pending.reject(data || event);
                });
            }
        }
    }
}


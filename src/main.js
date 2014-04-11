// main.js
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

(function(){
    (function(chrome){
        var workers = createWorkers();
        var idFactory = uniqueID.bind(this, chrome.app.window);
        var restart = whenReady(function(){
            chrome.storage.local.get(null, restoreWindows.bind(this, chrome, idFactory));
        });
        var launch = whenReady(function(){
            chrome.storage.local.get(null, function(settings){
                restoreWindows(chrome, idFactory, settings);
                var url = config.launch_url;
                var id = idFactory(url);
                if (!settings[id]) {
                    console.log("Launching", config.launch_url);
                    openWebview(chrome, idFactory, url, {
                        id: id
                    });
                }
            });
        });

        chrome.app.runtime.onLaunched.addListener(launch);
        chrome.app.runtime.onRestarted.addListener(restart);
        openRemoteBackgroundPage(chrome, workers, config.event_url)
            .then(restart.bind(this, 'ready'))
            .then(launch.bind(this, 'ready'))
            .catch(console.log.bind(console));

        chrome.runtime.onSuspend.addListener(closeAllWorkers.bind(this, workers));
        chrome.runtime.onSuspendCanceled.addListener(function(){
            workers = createWorkers();
        });
    })(chrome);

    function createWorkers() {
        return [
            new Worker('src/yahoo-quote.js'),
            new Worker('src/morningstar-financials.js'),
            new Worker('src/tmx-list.js'),
            new Worker('src/nasdaq-list.js')
        ];
    }

    function uniqueID(window, url){
        var hash = Math.abs(hashCode(url));
        var open = window.getAll().map(function(win) {
            return win.id;
        });
        while (open.indexOf('win' + hash.toString(16)) >= 0) hash++;
        return 'win' + hash.toString(16);
    }

    function hashCode(str){
        var hash = 0, i, char;
        if (str.length === 0) return hash;
        for (i = 0, l = str.length; i < l; i++) {
            char  = str.charCodeAt(i);
            hash  = ((hash<<5)-hash)+char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    function openRemoteBackgroundPage(chrome, workers, url) {
        return openWebview(chrome, undefined, url, {
            id: 'events',
            hidden: true
        }).then(sayHello.bind(this, workers));
    }

    function closeAllWorkers(workers) {
        workers.forEach(function(worker) {
            worker.postMessage("close");
        });
    }

    function restoreWindows(chrome, idFactory, settings){
        var alreadyOpen = chrome.app.window.getAll().map(function(win) {
            return win.id;
        });
        for (var id in settings) {
            if (id.indexOf('win') === 0 && alreadyOpen.indexOf(id) < 0) {
                console.log("Restoring " + id, settings[id]);
                openWebview(chrome, idFactory, settings[id], {
                    id: id
                });
            }
        }
    }

    function whenReady(func) {
        var fired = false;
        var ready = false;
        return function() {
            if (arguments[0] == 'ready')
                ready = true;
            else
                fired = true;
            if (ready && fired) {
                return func();
            }
        };
    }

    function postMessage(data, webview) {
        return new Promise(function(resolve, reject) {
            var channel = new MessageChannel();
            channel.port2.addEventListener('message', function(event){
                if (event.data.status == 'success') {
                    resolve(event.data.result);
                } else {
                    reject(event.data);
                }
            }, false);
            channel.port2.start();
            webview.contentWindow.postMessage(data, '*', [channel.port1]);
        });
    }

    function sayHello(workers, webview) {
        return Promise.all(workers.map(function(worker){
            return new Promise(function(resolve, reject){
                var channel = new MessageChannel();
                channel.port2.addEventListener('message', function(event){
                    webview.contentWindow.postMessage(event.data, '*', event.ports);
                    resolve(worker);
                }, false);
                channel.port2.start();
                worker.postMessage("hello", [channel.port1]);
            });
        }));
    }

    function openWebview(chrome, idFactory, url, options) {
        return new Promise(function(resolve, reject) {
            chrome.app.window.create('src/window.html', options, function(win){
                win.contentWindow.addEventListener('DOMContentLoaded', function(){
                    resolve(win);
                });
            });
        }).then(function(win){
            return new Promise(function(resolve, reject){
                var webview = win.contentWindow.document.querySelector('webview');
                webview.src = url;
                var once = function(e) {
                    resolve(webview);
                    webview.removeEventListener('consolemessage', once);
                };
                webview.addEventListener('consolemessage', once);
                webview.addEventListener('consolemessage', function(e) {
                    console.log(e.message);
                });
                if (idFactory) {
                    webview.addEventListener('newwindow', function(event) {
                        event.preventDefault();
                        var bounds = win.getBounds();
                        openWebview(chrome, idFactory, event.targetUrl, {
                            id: idFactory(event.targetUrl),
                            bounds: {
                                height: bounds.height,
                                width: bounds.width
                            }
                        });isTopLevel
                    });
                }
                if (options.id) {
                    var settings = {};
                    settings[options.id] = url;
                    chrome.storage.local.set(settings);
                    webview.addEventListener('loadcommit', function(event) {
                        if (event.isTopLevel) {
                            settings[options.id] = event.url;
                            chrome.storage.local.set(settings);
                        }
                    });
                    win.onClosed.addListener(function(){
                        chrome.storage.local.remove(options.id);
                    });
                }
            });
        });
    }
})();


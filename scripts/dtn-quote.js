// dtn-quote.js
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

(function(services) {
var hit = openHIT({});
var handler = {
    stop: function() {
        hit('close');
    },

    ping: function() {
        return 'pong';
    },

    validate: function(data) {
        if ('m1' != data.interval && 'm10' != data.interval && 'm60' != data.interval)
            return Promise.reject({status: 'error'});
        return (data.fields || []).reduce(function(memo, field){
            if (['open','high','low','close','volume','total_volume'].indexOf(field) >= 0)
                return memo;
            throw new Error("Unknown field: " + field);
        }, {status: 'success', interval: data.interval, fields: data.fields});
    },

    reset: function(data) {
        return {status: 'success'};
    },

    lookup: function(data) {
        return {status: 'success', result: []};
    },

    quote: function(data) {
        var interval = data.interval;
        if (interval != 'm1' && interval != 'm10' && interval != 'm60')
            return {status: 'success', result: []};
        var seconds = interval == 'm1' ? 60 : interval == 'm10' ? 600 : 3600;
        var symbol = (data.exchange.dtnPrefix || '') + data.ticker;
        var asof = Date.now();
        console.log("Loading", interval, symbol);
        return hit({
            symbol: symbol,
            seconds: seconds,
            begin: moment(data.start).tz('America/New_York').format('YYYYMMDD HHmmss'),
            end: data.end && moment(data.end).tz('America/New_York').format('YYYYMMDD HHmmss')
        }).then(function(lines){
            var results = lines.map(function(line){
                var row = line.split(',');
                return {
                    symbol: symbol,
                    dateTime: moment.tz(row[1], 'America/New_York').tz(data.exchange.tz).format(),
                    high: parseFloat(row[2]),
                    low: parseFloat(row[3]),
                    open: parseFloat(row[4]),
                    close: parseFloat(row[5]),
                    total_volume: parseFloat(row[6]),
                    volume: parseFloat(row[7])
                };
            }).filter(function(result){
                return result.close > 0 && result.close < 10000 && result.total_volume > 0;
            });
            if (results.length && moment(results[0].dateTime).valueOf() > asof - (seconds * 1000)) {
                results = results.slice(1); // first line might yet be incomplete
            }
            console.log("Read", results.length, interval, symbol);
            return {
                status: 'success',
                exchange: data.exchange,
                ticker: data.ticker,
                symbol: symbol,
                interval: interval,
                start: data.start,
                end: data.end,
                result: results
            };
        });
    }
};

function registerDtnQuote() {
    if (_.pluck(services.quote, 'name').indexOf('dtn-quote') < 0) {
        hit('open').then(function() {
            chrome.storage.local.set({dtn:true});
            return true;
        }, function(error){
            console.warn("Intraday data is not available");
            return new Promise(function(callback){
                chrome.storage.local.get(["dtn"], callback);
            }).then(function(items){
                return items.dtn;
            });
        }).then(function(available){
            if (available) services.quote.push({
                service: 'quote',
                name: 'dtn-quote',
                port: {
                    postMessage: function(data){
                        return handler[data.cmd || data](data);
                    }
                },
                promiseMessage: function(data) {
                    return Promise.resolve(handler[data.cmd || data](data));
                }
            });
        });
    }
}

registerDtnQuote();
chrome.app.runtime.onLaunched.addListener(registerDtnQuote);
chrome.app.runtime.onRestarted.addListener(registerDtnQuote);
chrome.runtime.onStartup.addListener(registerDtnQuote);
chrome.runtime.onSuspendCanceled.addListener(registerDtnQuote);

function openHIT(blacklist){
    var seq = 0;
    var pending = {};
    var lookupSocketIdPromise;
    return function(options) {
        return Promise.resolve(options).then(function(options){
            if (options == 'close') {
                return promiseLookupSocketId().then(function(socketId){
                    chrome.sockets.tcp.close(socketId);
                });
            } else if (options == 'open') {
                return promiseLookupSocketId();
            }
            if (!options || !options.symbol)
                throw Error("Missing symbol in " + JSON.stringify(options));
            return promiseLookupSocketId().then(function(socketId){
                return new Promise(function(callback, onerror){
                    if (blacklist[options.symbol])
                        throw Error(blacklist[options.symbol] + ": " + options.symbol);
                    var id = ++seq;
                    var cmd = ["HIT"];
                    cmd.push(options.symbol);
                    cmd.push(options.seconds);
                    cmd.push(options.begin);
                    cmd.push(options.end || '');
                    cmd.push(options.maxDatapoints || '');
                    cmd.push(options.beginFilterTime || '');
                    cmd.push(options.endFilterTime || '');
                    cmd.push(options.dataDirection || '0');
                    cmd.push(id);
                    cmd.push(options.datapointsPerSend || '');
                    cmd.push('s');
                    var msg = cmd.join(',');
                    pending[id] = {
                        symbol: options.symbol,
                        cmd: msg,
                        buffer:[],
                        callback: function(result) {
                            delete pending[id];
                            return callback(result);
                        },
                        error: function(e) {
                            delete pending[id];
                            return onerror(e);
                        }
                    };
                    console.log(msg);
                    chrome.sockets.tcp.send(socketId, str2ab(msg + '\r\n'), function(sendInfo) {
                        if (sendInfo.resultCode < 0) {
                            console.error(sendInfo);
                        }
                    });
                });
            });
        });
    };
    function promiseLookupSocketId() {
        if (!_.some(_.compose(_.property('connect'), _.property('tcp'))(chrome.runtime.getManifest().sockets), function(connect){
            return connect && connect.indexOf(":9100") >= 0;
        })) return Promise.reject();
        return lookupSocketIdPromise = (lookupSocketIdPromise || Promise.reject()).then(function(socketId){
            return new Promise(function(callback){
                chrome.sockets.tcp.getInfo(socketId, callback);
            }).then(function(socketInfo) {
                if (socketInfo.connected) return socketInfo.socketId;
                else throw Error("Socket not connected");
            });
        }).catch(function(){
            return promiseAdminSocketId().catch(console.error.bind(console)).then(function(){
                return new Promise(function(oncreate) {
                    console.log("Opening TCP Socket", 9100);
                    chrome.sockets.tcp.create({}, oncreate);
                });
            }).then(function(createInfo) {
                return createInfo.socketId;
            }).then(function(socketId) {
                return new Promise(function(onconnect) {
                    chrome.sockets.tcp.connect(socketId, "127.0.0.1", 9100, onconnect);
                }).then(function(result) {
                    if (result < 0) {
                        return Promise.reject(result);
                    } else {
                        return socketId;
                    }
                }).then(function(socketId) {
                    return new Promise(function(callback) {
                        chrome.sockets.tcp.send(socketId, str2ab("S,SET PROTOCOL,5.1\r\n"), callback);
                    }).then(function(sendInfo) {
                        if (sendInfo.resultCode < 0) {
                            return Promise.reject(sendInfo);
                        } else {
                            return socketId;
                        }
                    });
                }).then(function(socketId){
                    var buffer = '';
                    chrome.sockets.tcp.onReceive.addListener(function(info) {
                        if (info.socketId != socketId) return;
                        var data = ab2str(info.data);
                        buffer = buffer ? buffer + data : data;
                        while (buffer.indexOf('\n') >= 0) {
                            var idx = buffer.indexOf('\n') + 1;
                            var line = buffer.substring(0, idx).replace(/\s*$/,'');
                            buffer = buffer.substring(idx);
                            var id = line.substring(0, line.indexOf(','));
                            if (line.indexOf(id + ',!ENDMSG!,') === 0) {
                                if (pending[id])
                                    pending[id].callback(pending[id].buffer);
                            } else if (line.indexOf(id + ',E,') === 0) {
                                if (pending[id]) {
                                    var error = line.replace(/\w+,E,!?/,'').replace(/!?,*$/,'');
                                    if ("NO_DATA" != error) {
                                        blacklist[pending[id].symbol] = error;
                                        pending[id].error(Error(error + " for " + pending[id].cmd));
                                    }
                                }
                            } else if (pending[id]) {
                                pending[id].buffer.push(line);
                            } else {
                                console.log(line);
                            }
                        }
                    });
                    return socketId;
                }).catch(function(error) {
                    chrome.sockets.tcp.close(socketId);
                    return Promise.reject(error);
                });
            });
        });
    }

    function promiseAdminSocketId() {
        return new Promise(function(callback) {
            console.log("Opening TCP Socket", 9300);
            chrome.sockets.tcp.create({}, callback);
        }).then(function(createInfo) {
            return createInfo.socketId;
        }).then(function(socketId) {
            return new Promise(function(callback) {
                chrome.sockets.tcp.connect(socketId, "127.0.0.1", 9300, callback);
            }).then(function(result) {
                if (result < 0) {
                    return Promise.reject(result);
                } else {
                    return socketId;
                }
            }).then(function(socketId) {
                return new Promise(function(callback) {
                    console.log("S,CONNECT");
                    chrome.sockets.tcp.send(socketId, str2ab("S,CONNECT\r\n"), callback);
                }).then(function(sendInfo) {
                    if (sendInfo.resultCode < 0) {
                        return Promise.reject(sendInfo);
                    } else {
                        return socketId;
                    }
                });
            }).then(function(socketId){
                return new Promise(function(callback, abort) {
                    var registration;
                    var optionsWindow;
                    chrome.sockets.tcp.onReceiveError.addListener(function(info){
                        if (info.socketId == socketId) abort(info);
                    });
                    chrome.sockets.tcp.onReceive.addListener(function(info){
                        if (info.socketId != socketId) return;
                        var line = ab2str(info.data);
                        if (line && line.indexOf("S,STATS,") >= 0) {
                            if (line.indexOf("Not Connected") > 0) {
                                chrome.storage.local.get(["productId"], function(items){
                                    var productVersion = chrome.runtime.getManifest().version;
                                    var msg = "S,REGISTER CLIENT APP," + items.productId + "," + productVersion + "\r\n";
                                    if (items.productId && registration != msg) {
                                        registration = msg;
                                        console.log(line);
                                        console.log(msg);
                                        chrome.sockets.tcp.send(info.socketId, str2ab(msg), function(sendInfo) {
                                            if (sendInfo.resultCode < 0) {
                                                abort(sendInfo);
                                            } else {
                                                console.log("S,CONNECT");
                                                chrome.sockets.tcp.send(info.socketId, str2ab("S,CONNECT"), function(sendInfo) {
                                                    if (sendInfo.resultCode < 0) {
                                                        console.error(sendInfo);
                                                    }
                                                });
                                            }
                                        });
                                    } else if (!optionsWindow) {
                                        chrome.app.window.create("pages/dtn-options.html", {
                                            id: "pages/dtn-options.html"
                                        }, function(createdWindow){
                                            optionsWindow = createdWindow;
                                            createdWindow.onClosed.addListener(function(){
                                                optionsWindow = null;
                                            });
                                        });
                                    }
                                });
                            } else {
                                if (optionsWindow) {
                                    console.log(line);
                                    optionsWindow.close();
                                }
                                callback(socketId);
                            }
                        } else if (line && line.indexOf("S,REGISTER CLIENT APP COMPLETED") === 0) {
                            console.log(line);
                            console.log("S,CONNECT");
                            chrome.sockets.tcp.send(info.socketId, str2ab("S,CONNECT"), function(sendInfo) {
                                if (sendInfo.resultCode < 0) {
                                    console.error(sendInfo);
                                }
                            });
                        } else {
                            console.log(line);
                        }
                    });
                });
            }).catch(function(error) {
                chrome.sockets.tcp.close(socketId);
                return Promise.reject(error);
            });
        });
    }
    function ab2str(buf) {
      return String.fromCharCode.apply(null, new Uint8Array(buf));
    }
    function str2ab(str) {
      var buf = new ArrayBuffer(str.length);
      var bufView = new Uint8Array(buf);
      for (var i=0, strLen=str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    }
}
})(services);

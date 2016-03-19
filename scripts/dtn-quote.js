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
var iqfeed = createIQFeed();
var handler = {
    stop: function() {
        iqfeed.close();
    },

    ping: function() {
        return 'pong';
    },

    validate: function(data) {
        if (!data.interval.match(/^m[0-9]+$/))
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

    security: function(data) {
        var prefix = data.security.exchange.dtnPrefix || '';
        var symbol = prefix + data.security.ticker;
        return iqfeed.fundamental(symbol).then(function(fundamental){
            var startsWith = prefix && fundamental.symbol.indexOf(prefix) === 0;
            return _.defaults({
                name: fundamental.company_name,
                ticker: startsWith ? fundamental.symbol.substring(prefix.length) : fundamental.symbol
            }, _.pick(fundamental, [
                'dividend_yield', 'exdividend_date', 'current_assets', 'common_shares_outstanding', 'split_factor_1', 'split_factor_2', 'listed_market', 'expiration_date', 'exchange_root'
            ]), data.security);
        }).then(function(result){
            return {status: 'success', result: result};
        });
    },

    watch: function(data, update) {
        var prefix = data.security.exchange.dtnPrefix || '';
        var symbol = prefix + data.security.ticker;
        var format = function(result){
            var date = result.most_recent_trade_date.match(/(\d+)\/(\d+)\/(\d\d\d\d)/);
            var time = result.most_recent_trade_timems;
            var lastTrade = date[3] + '-' + date[1] + '-' + date[2] + ' ' + time;
            return _.defaults({
                lastTrade: moment.tz(lastTrade, 'America/New_York').toISOString(),
                price: result.most_recent_trade
            });
        };
        return iqfeed.summary(symbol, _.compose(update, format)).then(format).then(function(result){
            return {status: 'success', result: result};
        });
    },

    quote: function(data) {
        var interval = data.interval;
        if (!interval.match(/^m[0-9]+$/))
            return {status: 'success', result: []};
        var seconds = 60 * parseInt(interval.match(/^m([0-9]+)$/)[1]);
        var symbol = (data.security.exchange.dtnPrefix || '') + data.security.ticker;
        var now = new Date();
        console.log("Loading", interval, symbol, data.start);
        return iqfeed.hit({
            symbol: symbol,
            seconds: seconds,
            begin: moment(data.start).tz('America/New_York').format('YYYYMMDD HHmmss'),
            end: data.end && moment(data.end).tz('America/New_York').format('YYYYMMDD HHmmss')
        }).then(function(lines){
            var results = lines.map(function(line){
                var row = line.split(',');
                return {
                    symbol: symbol,
                    dateTime: moment.tz(row[1], 'America/New_York').tz(data.security.exchange.tz).format(),
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
            if (results.length && moment(results[0].dateTime).valueOf() > now.valueOf() - (seconds * 1000)) {
                results[0].incomplete = true; // first line might yet be incomplete
                results[0].lastTrade = now.toISOString();
            }
            console.log("Read", results.length, interval, symbol);
            return {
                status: 'success',
                security: data.security,
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
        iqfeed.open().then(function() {
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
            if (available) services.quote.unshift({
                service: 'quote',
                name: 'dtn-quote',
                port: {
                    postMessage: function(data){
                        return handler[data.cmd || data](data);
                    }
                },
                promiseMessage: function(data, update) {
                    return Promise.resolve(handler[data.cmd || data](data, update));
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

function createIQFeed(){
    var adminPromise;
    var admin = function(){
        return adminPromise = promiseSocket(adminPromise, promiseNewAdminSocket.bind(this, 9300));
    };
    var lookup = hit(admin);
    var level1 = watch(admin);
    return {
        open: function() {
            return admin();
        },
        close: function() {
            return admin().then(function(socketId){
                chrome.sockets.tcp.close(socketId);
                lookup('close');
                level1('close');
            });
        },
        hit: promiseThrottle(lookup, 2),
        fundamental: promiseThrottle(cache('dtn-fundamental', function(symbol){
            return level1({
                type: 'fundamental',
                symbol: symbol
            });
        }, 7*24*60*60*1000), 100),
        summary: function(symbol, update){
            return level1({
                type: 'summary',
                symbol: symbol,
                update: update
            });
        }
    };
}

function hit(ready) {
    var seq = 0;
    var blacklist = {};
    var pending = {};
    var lookupPromise;
    var lookup = function(){
        return lookupPromise = promiseSocket(lookupPromise, function(){
            return ready().then(function(){
                return promiseNewLookupSocket(blacklist, pending, 9100, lookup);
            });
        });
    };
    return function(options) {
        return Promise.resolve(options).then(function(options){
            if ('close' == options) return lookup().then(chrome.sockets.tcp.close);
            if (!options || !options.symbol)
                throw Error("Missing symbol in " + JSON.stringify(options));
            return lookup().then(function(socketId){
                var id = ++seq;
                return new Promise(function(callback, onerror){
                    if (blacklist[options.symbol])
                        throw Error(blacklist[options.symbol] + ": " + options.symbol);
                    var cmd = [
                        "HIT",
                        options.symbol,
                        options.seconds,
                        options.begin,
                        options.end || '',
                        options.maxDatapoints || '',
                        options.beginFilterTime || '',
                        options.endFilterTime || '',
                        options.dataDirection || '0',
                        id,
                        options.datapointsPerSend || '',
                        's'
                    ].join(',');
                    pending[id] = {
                        symbol: options.symbol,
                        cmd: cmd,
                        buffer:[],
                        socketId: socketId,
                        callback: function(result) {
                            delete pending[id];
                            return callback(result);
                        },
                        error: function(e) {
                            delete pending[id];
                            return onerror(e);
                        }
                    };
                    send(cmd, socketId);
                });
            })
        });
    };
}

function watch(ready) {
    var blacklist = {};
    var watching = {};
    var level1Promise;
    var level1 = function(){
        return level1Promise = promiseSocket(level1Promise, function(){
            return ready().then(function(){
                return promiseNewLevel1Socket(blacklist, watching, 5009, level1);
            });
        });
    };
    return function(options) {
        return Promise.resolve(options).then(function(options){
            if ('close' == options) return level1().then(chrome.sockets.tcp.close);
            if (!options || !options.symbol)
                throw Error("Missing symbol in " + JSON.stringify(options));
            return level1().then(function(socketId){
                return new Promise(function(callback, onerror){
                    var symbol = options.symbol;
                    var pending = {
                        symbol: symbol,
                        socketId: socketId,
                        fundamental: function(result) {
                            if (!options.update) {
                                deregister(watching, socketId, symbol, pending);
                                return callback(result);
                            }
                        },
                        summary: function(result) {
                            if (options.update) callback(result);
                        },
                        update: function(result) {
                            try {
                                if (options.update) return options.update(result);
                            } catch(e) {
                                console.log(e);
                            }
                            deregister(watching, socketId, symbol, pending);
                        },
                        error: function(e) {
                            deregister(watching, socketId, symbol, pending);
                            return onerror(e);
                        }
                    };
                    var cmd = (_.isEmpty(watching[symbol]) ? 't' : 'f') + symbol;
                    if (!watching[symbol]) {
                        watching[symbol] = [];
                    }
                    watching[symbol].push(pending);
                    send(cmd, socketId);
                });
            });
        });
    };
}

function deregister(watching, socketId, symbol, pending) {
    watching[symbol] = _.without(watching[symbol], pending);
    if (_.isEmpty(watching[symbol])) {
        delete watching[symbol];
        send('r' + symbol, socketId);
    }
}

function promiseSocket(previous, createNewSocket) {
        if (!_.some(_.compose(_.property('connect'), _.property('tcp'))(chrome.runtime.getManifest().sockets), function(connect){
            return connect && connect.indexOf(':9300') >= 0;
        })) return Promise.reject();
    return (previous || Promise.reject()).then(function(socketId){
        return new Promise(function(callback){
            chrome.sockets.tcp.getInfo(socketId, callback);
        }).then(function(socketInfo) {
            if (socketInfo.connected) return socketInfo.socketId;
            else throw Error("Socket not connected");
        });
    }).catch(createNewSocket);
}

function promiseNewLookupSocket(blacklist, pending, port, retry) {
    return openSocket(port).then(function(socketId) {
        return send('S,SET PROTOCOL,5.1', socketId).then(function(socketId) {
            chrome.sockets.tcp.onReceiveError.addListener(function(info){
                if (info.socketId == socketId) {
                    // close and reconnect in a second
                    console.error(info);
                    chrome.sockets.tcp.close(socketId);
                    _.delay(retry, 1000);
                }
            });
            onreceive(socketId, function(line) {
                var id = line.substring(0, line.indexOf(','));
                if (line.indexOf(id + ',!ENDMSG!,') === 0) {
                    if (pending[id])
                        pending[id].callback(pending[id].buffer);
                    return false;
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
                    return false;
                }
            });
            // on reconnect, resend pending messages
            _.each(pending, function(item){
                send(item.cmd, socketId);
            });
            return socketId;
        }).catch(function(error) {
            chrome.sockets.tcp.close(socketId);
            return Promise.reject(error);
        });
    });
}

function promiseNewLevel1Socket(blacklist, watching, port, retry) {
    var fundamentalFormat = ['type', 'symbol', 'exchange_id', 'pe', 'average_volume', '52_week_high', '52_week_low', 'calendar_year_high', 'calendar_year_low', 'dividend_yield', 'dividend_amount', 'dividend_rate', 'pay_date', 'exdividend_date', 'reserved', 'reserved', 'reserved', 'short_interest', 'reserved', 'current_year_earnings_per_share', 'next_year_earnings_per_share', 'five_year_growth_percentage', 'fiscal_year_end', 'reserved', 'company_name', 'root_option_symbol', 'percent_held_by_institutions', 'beta', 'leaps', 'current_assets', 'current_liabilities', 'balance_sheet_date', 'long_term_debt', 'common_shares_outstanding', 'reserved', 'split_factor_1', 'split_factor_2', 'reserved', 'reserved', 'format_code', 'precision', 'sic', 'historical_volatility', 'security_type', 'listed_market', '52_week_high_date', '52_week_low_date', 'calendar_year_high_date', 'calendar_year_low_date', 'year_end_close', 'maturity_date', 'coupon_rate', 'expiration_date', 'strike_price', 'naics', 'exchange_root'];
    var summaryFormat = ['type', 'symbol', 'close', 'most_recent_trade_date', 'most_recent_trade_timems', 'most_recent_trade'];
    return openSocket(port).then(function(socketId) {
        return send('S,SET PROTOCOL,5.1', socketId).then(send.bind(this, 'S,SELECT UPDATE FIELDS,Close,Most Recent Trade Date,Most Recent Trade TimeMS,Most Recent Trade')).then(function(socketId){
            chrome.sockets.tcp.onReceiveError.addListener(function(info){
                if (info.socketId == socketId) {
                    // close and reconnect in a second
                    console.error(info);
                    chrome.sockets.tcp.close(socketId);
                    _.delay(retry, 1000);
                }
            });
            onreceive(socketId, function(line) {
                var row = line.split(',');
                if ('T' == row[0]) { // Time
                    return false;
                } else if ('n' == row[0]) { // Symbol not found
                    var symbol = row[1];
                    _.each(watching[symbol], function(item){
                        item.error(Error("Symbol not found: " + symbol));
                    });
                    return false;
                } else if ('F' == row[0]) { // Fundamental
                    var trim = String.prototype.trim.call.bind(String.prototype.trim);
                    var object = _.omit(_.object(fundamentalFormat, row.map(trim)), _.isEmpty);
                    _.each(watching[object.symbol], function(item){
                        item.fundamental(object);
                    });
                    return false;
                } else if ('P' == row[0]) { // Summary
                    var object = _.object(summaryFormat, row);
                    _.each(watching[object.symbol], function(item){
                        item.summary(object);
                    });
                    return false;
                } else if ('Q' == row[0]) { // Update
                    var object = _.object(summaryFormat, row);
                    _.each(watching[object.symbol], function(item){
                        item.update(object);
                    });
                    return false;
                } else if ('E' == row[0]) { // Update
                    console.error(row[1]);
                    return false;
                }
            });
            // on reconnect, resend pending messages
            _.each(_.keys(watching), function(symbol){
                send('t' + symbol, socketId);
            });
            return socketId;
        }).catch(function(error) {
            chrome.sockets.tcp.close(socketId);
            return Promise.reject(error);
        });
    });
}

function promiseNewAdminSocket(port) {
    return openSocket(port).then(function(socketId) {
        return send('S,CONNECT', socketId).then(function(socketId){
            return new Promise(function(callback, abort) {
                var registration;
                var optionsWindow;
                chrome.sockets.tcp.onReceiveError.addListener(function(info){
                    if (info.socketId == socketId) {
                        console.error(info);
                        chrome.sockets.tcp.close(socketId);
                        abort(info);
                    }
                });
                onreceive(socketId, function(line) {
                    if (line && line.indexOf("S,STATS,") >= 0) {
                        if (line.indexOf("Not Connected") > 0) {
                            chrome.storage.local.get(["productId"], function(items){
                                var productVersion = chrome.runtime.getManifest().version;
                                var msg = "S,REGISTER CLIENT APP," + items.productId + "," + productVersion;
                                if (items.productId && registration != msg) {
                                    registration = msg;
                                    send(msg, info.socketId).then(send.bind(this, 'S,CONNECT'), abort);
                                } else if (!optionsWindow) {
                                    chrome.app.window.create("pages/dtn-options.html", {
                                        id: "pages/dtn-options.html"
                                    }, function(createdWindow){
                                        optionsWindow = createdWindow;
                                        createdWindow.onClosed.addListener(function(){
                                            optionsWindow = null;
                                        });
                                    });
                                } else return false;
                            });
                        } else {
                            if (optionsWindow) {
                                optionsWindow.close();
                            }
                            callback(socketId);
                            return false;
                        }
                    } else if (line && line.indexOf("S,REGISTER CLIENT APP COMPLETED") === 0) {
                        send('S,CONNECT', info.socketId);
                    }
                });
            });
        }).catch(function(error) {
            chrome.sockets.tcp.close(socketId);
            return Promise.reject(error);
        });
    });
}

function openSocket(port) {
    return new Promise(function(callback) {
        console.log("Opening TCP Socket", port);
        chrome.sockets.tcp.create({}, callback);
    }).then(function(createInfo) {
        return createInfo.socketId;
    }).then(function(socketId) {
        return new Promise(function(callback) {
            chrome.sockets.tcp.connect(socketId, "127.0.0.1", port, callback);
        }).then(function(result) {
            if (result < 0) {
                return Promise.reject(result);
            } else {
                return socketId;
            }
        });
    });
}

function send(cmd, socketId) {
    return new Promise(function(callback) {
        console.log(cmd);
        chrome.sockets.tcp.send(socketId, str2ab(cmd + '\r\n'), callback);
    }).then(function(sendInfo) {
        if (sendInfo.resultCode < 0) {
            return Promise.reject(sendInfo);
        } else {
            return socketId;
        }
    });
}

function onreceive(socketId, listener) {
    var buffer = '';
    chrome.sockets.tcp.onReceive.addListener(function(info) {
        if (info.socketId != socketId) return;
        var data = ab2str(info.data);
        buffer = buffer ? buffer + data : data;
        while (buffer.indexOf('\n') >= 0) {
            var idx = buffer.indexOf('\n') + 1;
            var line = buffer.substring(0, idx).replace(/\s*$/,'');
            buffer = buffer.substring(idx);
            try {
                var ret = listener(line);
                if (ret !== false) {
                    console.log(line);
                }
            } catch (e) {
                console.error(e);
            }
        }
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

function promiseThrottle(fn, limit) {
    var currently = 0;
    var queue = [];
    var next = function(){
        if (currently < limit && queue.length) {
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
})(services);

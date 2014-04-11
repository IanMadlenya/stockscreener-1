// yahoo-quote.js
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

onmessage = dispatch.bind(this, {

    close: function() {
        self.close();
    },

    ping: function() {
        return 'pong';
    },

    hello: function(event) {
        var channel = new MessageChannel();
        channel.port2.addEventListener('message', onmessage, false);
        channel.port2.start();
        event.ports[0].postMessage({
            cmd: 'register',
            service: 'quote'
        }, [channel.port1]);
    },

    validate: function(event) {
        if ('d1' != event.data.interval)
            return Promise.reject({status: 'error'});
        return event.data.fields.reduce(function(memo, field){
            if (['open','high','low','close','volume','adj_close'].indexOf(field) >= 0)
                return memo;
            throw new Error("Unknown field: " + field);
        }, {status: 'success'});
    },

    quote: (function(lookupSymbol, loadSymbol, loadCSV, event) {
        var data = event.data;
        var interval = data.interval;
        if (data.interval != 'd1') return {status: 'success', result: []};
        var symbol = guessSymbol(data.exchange, data.ticker);
        return loadSymbol(data, symbol).then(function(result) {
            if (result.length) return result;
            return Promise.resolve().then(function(){
                if (data.ticker.match(/^[A-Z]+$/))
                    return symbol;
                return lookupSymbol(data.exchange, data.ticker);
            }).then(function(lookup){
                if (!lookup) return [];
                return Promise.resolve(lookup).then(function(lookup){
                    if (symbol != lookup)
                        return loadSymbol(data, lookup);
                    return result;
                }).then(function(result) {
                    if (result.length) return result;
                    return loadCSV(data, lookup);
                });
            });
        }).then(function(result){
            return {
                status: 'success',
                exchange: data.exchange,
                ticker: data.ticker,
                interval: data.interval,
                start: data.start,
                end: data.end,
                result: result
            };
        });
    }).bind(this, lookupSymbol.bind(this, memoize(synchronized(listSymbols))), loadSymbol.bind(this, queue(loadQuotes)), synchronized(loadCSV))
});

function loadSymbol(loadQuotes, data, symbol){
    return loadQuotes({
        symbol: symbol,
        start: data.start,
        end: data.end,
        marketClosesAt: data.exchange.marketClosesAt
    }).then(function(results) {
        return results.filter(function(result){
            return result.symbol == symbol;
        });
    });
}

function loadQuotes(queue) {
    var time = queue.reduce(function(time, item) {
        var m = item.marketClosesAt.match(/(\d+)(:\d+:\d+)/);
        var hour = parseInt(m[1], 10);
        time[item.symbol] = ' ' + Math.min(hour + 5,23) + m[2];
        return time;
    }, {});
    var filters = [];
    var byFilter = queue.reduce(function(byFilter, item) {
        var filter = [
            'startDate="', item.start.substring(0, 10),
            '" and endDate="', item.end.substring(0, 10), '"'
        ].join('');
        var ar = byFilter[filter];
        if (ar) {
            if (ar.indexOf(item.symbol) < 0) {
                ar.push(item.symbol);
            }
        } else {
            filters.push(filter);
            byFilter[filter] = [item.symbol];
        }
        return byFilter;
    }, {});
    return Promise.all(filters.map(function(filter) {
        var url = [
            "http://query.yahooapis.com/v1/public/yql?q=",
            encodeURIComponent([
                'select * from yahoo.finance.historicaldata where symbol in (',
                byFilter[filter].sort().reduce(function(sb, symbol) {
                    sb.push('"' + symbol.replace(/"/g, '\\"') + '"');
                    return sb;
                }, []).join(','),
                ') and ', filter
            ].join('')),
            "&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys"
        ].join('');
        return promiseText(url).then(parseJSON).then(function(result){
            if (result.query.results) return result.query.results.quote;
            return [];
        });
    })).then(function(arrays){
        return arrays.reduce(function(memo, array){
            return memo.concat(array);
        }, []);
    }).then(function(results){
        return results.map(function(result){
            return {
                symbol: result.Symbol,
                dateTime: result.Date + time[result.Symbol],
                open: parseFloat(result.Open),
                high: parseFloat(result.High),
                low: parseFloat(result.Low),
                close: parseFloat(result.Close),
                volume: parseFloat(result.Volume),
                adj_close: parseFloat(result.Adj_Close)
            };
        });
    });
}

function loadCSV(data, symbol) {
    var from = data.start.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
    var to = data.end.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
    var url = [
        "http://ichart.finance.yahoo.com/table.csv?s=", encodeURIComponent(symbol),
        "&a=", parseInt(from[2], 10) - 1, "&b=", from[3], "&c=", from[1],
        "&d=", parseInt(to[2], 10) - 1, "&e=", to[3], "&f=", to[1],
        "&g=d"
    ].join('');
    return promiseText(url).then(function(csv){
        return csv.split(/\r?\n/);
    }).then(function(lines){
        return lines.map(function(line) {
            return parseCSVLine(line);
        });
    }).then(function(rows){
        var headers = [];
        return rows.reduce(function(points, row){
            if (headers.length && headers.length == row.length) {
                points.push(object(headers, row));
            } else {
                headers = row;
            }
            return points;
        }, []);
    }).then(function(results){
        var m = data.exchange.marketClosesAt.match(/(\d+)(:\d+:\d+)/);
        var hour = parseInt(m[1], 10);
        var time = ' ' + Math.min(hour + 5,23) + m[2];
        return results.map(function(result){
            return {
                symbol: symbol,
                dateTime: result.Date + time,
                open: parseFloat(result.Open),
                high: parseFloat(result.High),
                low: parseFloat(result.Low),
                close: parseFloat(result.Close),
                volume: parseFloat(result.Volume),
                adj_close: parseFloat(result['Adj Close'])
            };
        });
    });
}

function guessSymbol(exchange, ticker) {
    return ticker
        .replace(/\^/, '-P')
        .replace(/[\.\-\/]/, '-')
        .replace(/-PR./, '-P')
        .replace(/\./g, '') +
        (exchange.yahooSuffix ? exchange.yahooSuffix : '');
}

function lookupSymbol(listSymbols, exchange, ticker) {
    var root = ticker.replace(/^\W+/, '').replace(/\W.*$/, '');
    var url = [
        "http://d.yimg.com/aq/autoc?callback=YAHOO.util.ScriptNodeDataSource.callbacks",
        "&lang=", exchange.marketLang,
        "&query=", encodeURIComponent(root)
    ].join('');
    return listSymbols(url, root).then(function(results){
        return results.filter(function(result){
            return result.exch == exchange.exch;
        });
    }).then(function(results){
        if (results.length < 2) return results;
        var last = ticker.charAt(ticker.length - 1);
        var regex = new RegExp(ticker.replace(/\W/g, '.*'));
        return results.sort(function(a, b){
            if (a.symbol == ticker) return -1;
            if (b.symbol == ticker) return 1;
            var ma = a.symbol.match(regex);
            var mb = b.symbol.match(regex);
            if (ma && !mb) return -1;
            if (!ma && mb) return 1;
            var lasta = a.symbol.charAt(a.symbol.length - 1);
            var lastb = b.symbol.charAt(b.symbol.length - 1);
            if (last == lasta && last != lastb) return -1;
            if (last != lasta && last == lastb) return 1;
            if (a.symbol.length < b.symbol.length) return -1;
            if (a.symbol.length > b.symbol.length) return 1;
            if (a.symbol < b.symbol) return -1;
            if (a.symbol > b.symbol) return 1;
            return 0;
        });
    }).then(function(results){
        if (!results.length) return undefined;
        return results[0].symbol;
    }).then(function(symbol){
        if (symbol != ticker)
            console.log("Using Yahoo! symbol " + symbol + " for security " + exchange.mic + ':' + ticker);
        return symbol;
    });
}

function listSymbols(url, root) {
    return promiseText(url).then(function(jsonp) {
        return jsonp.replace(/^\s*YAHOO.util.ScriptNodeDataSource.callbacks\((.*)\)\s*$/, '$1');
    }).then(parseJSON).then(function(json) {
        return json.ResultSet.Result;
    }).then(function(results){
        var regex = new RegExp('\\b' + root + '\\b');
        return results.filter(function(result){
            return result.symbol.match(regex);
        });
    });
}

function parseJSON(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        // Yahoo does not escape special characters in company name
        // like double quotes or control chars, causing the block to end abruptly
        var regex = /{"symbol":"([^{]*)","name": "([^{]*)","exch": "([^{]*)","type": "([^{]*)","exchDisp":"([^{]*)","typeDisp":"([^{]*)"}/g;
        var m, result = [];
        while (m = regex.exec(text)) {
            result.push({
                symbol: m[1],
                name: m[2],
                exch: m[3],
                type: m[4],
                exchDisp: m[5],
                typeDisp: m[6]
            });
        }
        return {ResultSet:{Result:result}};
    }
}

function parseCSVLine(line) {
    if (line.indexOf(',') < 0) return [line];
    var m;
    var row = [];
    var regex = /(?:,|^)(?:"([^"]*)"|([^",]*))/g;
    if (line.charAt(0) == ',') {
        row.push('');
    }
    while (m = regex.exec(line)) {
        row.push(m[1] || m[2]);
    }
    return row;
}

function queue(func) {
    var context, timeout, promise = Promise.resolve();
    var queue = [], listeners = [];

    return function(items) {
        context = this;
        return new Promise(function(resolve, reject) {
            queue = queue.concat(items);
            listeners.push({resolve: resolve, reject: reject});
            promise.then(function(){
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(function() {
                    var taken = queue.slice(0, queue.length);
                    var notifications = listeners.slice(0, listeners.length);
                    timeout = null;
                    queue = [];
                    listeners = [];
                    promise = func.call(context, taken).then(function(result) {
                        for (var i=0; i<notifications.length; i++) {
                            notifications[i].resolve(result);
                        }
                    }, function(error) {
                        for (var i=0; i<notifications.length; i++) {
                            notifications[i].reject(error);
                        }
                    });
                });
            });
        });
    };
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
    return function() {
        var key = arguments[0] || '*';
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

function promiseText(url) {
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

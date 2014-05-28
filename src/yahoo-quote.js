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

importScripts('utils.js');

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
            service: 'quote',
            name: 'yahoo-quote'
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

    quote: (function(symbolMap, lookupSymbol, loadSymbol, loadPriceTable, event) {
        var data = event.data;
        var interval = data.interval;
        if (data.interval != 'd1') return {status: 'success', result: []};
        var symbol = guessSymbol(data.exchange, data.ticker);
        var mapped = symbolMap[symbol];
        return loadSymbol(data, mapped || symbol).catch(function(error) {
            if (mapped || data.ticker.match(/^[A-Z]+$/))
                return Promise.reject(error);
            return lookupSymbol(data.exchange, data.ticker).then(function(lookup){
                if (!lookup || symbol == lookup)
                    return Promise.reject(error);
                symbolMap[symbol] = lookup;
                console.log("Using Yahoo! symbol " + lookup + " for security " + data.exchange.mic + ':' + data.ticker);
                return loadSymbol(data, lookup);
            });
        }).catch(
            loadPriceTable.bind(this, data, symbolMap[symbol] || symbol)
        ).then(function(result){
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
    }).bind(this,
        {},
        lookupSymbol.bind(this, memoize(synchronized(listSymbols))),
        loadSymbol.bind(this,
            queue(loadQuotes, 100),
            readStartDate.bind(this, indexedDB),
            deleteStartDateIfAfter.bind(this, indexedDB)
        ),
        loadPriceTable.bind(this,
            synchronized(loadCSV),
            recordStartDate.bind(this, indexedDB),
            deleteStartDateIfAfter.bind(this, indexedDB)
        )
    )
});

function loadSymbol(loadQuotes, readStartDate, deleteStartDateIfAfter, data, symbol){
    if (data.start > data.end) throw Error(data.start + " is after " + data.end);
    return readStartDate(symbol).then(function(startDate){
        if (data.end < startDate) return [];
        return loadQuotes([{
            symbol: symbol,
            start: data.start,
            end: data.end,
            marketClosesAt: data.exchange.marketClosesAt
        }]).then(function(results) {
            return results.filter(function(result){
                return result.symbol == symbol;
            });
        }).then(function(results){
            if (results.length)
                deleteStartDateIfAfter(symbol, results[results.length-1].Date);
            if (results.length) return results;
            throw Error("Empty results for " + symbol);
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
    return filters.reduce(function(promise, filter){
        var url = [
            "http://query.yahooapis.com/v1/public/yql?q=",
            encodeURIComponent([
                'select * from yahoo.finance.historicaldata where symbol in (',
                byFilter[filter].sort().reduce(function(sb, symbol) {
                    sb.push("'" + symbol.replace(/'/g, "\\'") + "'");
                    return sb;
                }, []).join(','),
                ') and ', filter
            ].join('')).replace(/%2C/g, ','),
            "&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys"
        ].join('');
        return promise.then(function(array){
            return promiseText(url).then(parseJSON).then(function(result){
                if (result.query.results)
                    return result.query.results.quote;
                return [];
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
            }).then(function(results){
                return array.concat(results);
            });
        });
    }, Promise.resolve([]));
}

function loadPriceTable(loadCSV, recordStartDate, deleteStartDateIfAfter, data, symbol) {
    var start = data.start.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
    var end = data.end.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
    var url = [
        "http://ichart.finance.yahoo.com/table.csv?s=", encodeURIComponent(symbol),
        "&a=", parseInt(start[2], 10) - 1, "&b=", start[3], "&c=", start[1],
        "&d=", parseInt(end[2], 10) - 1, "&e=", end[3], "&f=", end[1],
        "&g=d"
    ].join('');
    return loadCSV(url).catch(function(error){
        if (error.statusCode == 404) {
            recordStartDate(symbol, end[0]);
            return [];
        }
        return Promise.reject(error);
    }).then(function(results){
        if (results.length)
            deleteStartDateIfAfter(symbol, results[results.length-1].Date);
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

function queue(func, batchSize) {
    var context, promise = Promise.resolve();
    var queue = [], listeners = [];

    return function(items) {
        context = this;
        return new Promise(function(resolve, reject) {
            queue = queue.concat(items);
            listeners.push({resolve: resolve, reject: reject});
            promise = promise.then(function(){
                var taken = queue.splice(0, batchSize);
                var notifications = listeners.splice(0, batchSize);
                if (!taken.length) return undefined;
                return func.call(context, taken).then(function(result) {
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
    };
}

function recordStartDate(indexedDB, symbol, date) {
    var parsed = date.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
    var year = parseInt(parsed[1], 10);
    var month = parseInt(parsed[2], 10);
    var day = parseInt(parsed[3], 10);
    var start = new Date(year, month - 2, day);
    var end = new Date(year, month, day);
    var url = [
        "http://ichart.finance.yahoo.com/table.csv?s=", encodeURIComponent(symbol),
        "&a=", start.getMonth(), "&b=", start.getDate(), "&c=", start.getFullYear(),
        "&d=", end.getMonth(), "&e=", end.getDate(), "&f=", end.getFullYear(),
        "&g=d"
    ].join('');
    return loadCSV(url).then(function(rows){
        var startDate = rows.length && rows[rows.length - 1].Date;
        if (startDate && startDate > parsed[0]) {
            // no data before startDate appears to be available
            return writeStartDate(indexedDB, symbol, startDate);
        } else {
            // recent symbol data is not available, blacklist until tomorrow
            var tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return writeStartDate(indexedDB, symbol, formatDate(tomorrow));
        }
    }, function(error){
        if (error.statusCode == 404 && end.valueOf() < Date.now()) {
            // keep searching for startDate, one month at a time
            return recordStartDate(symbol, formatDate(end));
        } else if (error.statusCode == 404) {
            // ignore any future requests for this symbol for one month
            var nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return writeStartDate(indexedDB, symbol, formatDate(nextMonth));
        } else {
            return Promise.reject(error);
        }
    });
}

function formatDate(date) {
    return [date.getFullYear(), date.getMonth()+1, date.getDate()].join('-');
}

function writeStartDate(indexedDB, symbol, date) {
    new Promise(function(resolve, reject){
        return openStartDateDatabase(indexedDB).then(function(db){
            var store = db.transaction(['startDate'], "readwrite").objectStore('startDate');
            var request = store.put(date, symbol);
            request.onsuccess = resolve;
            request.onerror = reject;
        });
    });
}

function deleteStartDateIfAfter(indexedDB, symbol, date) {
    return new Promise(function(resolve, reject){
        return openStartDateDatabase(indexedDB).then(function(db){
            var store = db.transaction(['startDate'], "readwrite").objectStore('startDate');
            var request = store.get(symbol);
            request.onerror = reject;
            request.onsuccess = function(event){
                var startDate = event.target.result;
                if (date < startDate) {
                    var request = store.delete(symbol);
                    request.onerror = reject;
                    request.onsuccess = resolve;
                }
            };
        });
    });
}

function readStartDate(indexedDB, symbol) {
    return new Promise(function(resolve, reject){
        return openStartDateDatabase(indexedDB).then(function(db){
            var store = db.transaction(['startDate']).objectStore('startDate');
            var request = store.get(symbol);
            request.onsuccess = resolve;
            request.onerror = reject;
        });
    }).then(function(event){
        return event.target.result;
    });
}

function openStartDateDatabase(indexedDB) {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open('yahoo-quote');
        request.onsuccess = resolve;
        request.onerror = reject;
        request.onupgradeneeded = function(event) {
            var db = event.target.result;
            db.createObjectStore('startDate');
        };
    }).then(function(event){
        return event.target.result;
    });
}

function loadCSV(url){
    return promiseText(url).then(parseCSV).then(rows2objects);
}

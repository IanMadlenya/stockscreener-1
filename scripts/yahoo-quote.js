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

importScripts('../assets/underscore.js');
importScripts('utils.js');

onmessage = handle.bind(this, {
    start: function() {
        return "started";
    },

    stop: function() {
        self.close();
    },

    ping: function() {
        return 'pong';
    },

    validate: function(data) {
        if ('day' != data.interval && 'week' != data.interval && 'month' != data.interval)
            return Promise.reject({status: 'error'});
        return (data.fields || []).reduce(function(memo, field){
            if (['open','high','low','close','volume','adj_close'].indexOf(field) >= 0)
                return memo;
            throw new Error("Unknown field: " + field);
        }, {status: 'success', interval: data.interval, fields: data.fields});
    },

    reset: function(data) {
        return openSecurityDatabase('readwrite', function(store, resolve, reject){
            store.clear();
        }).then(function(){
            return {
                status: 'success'
            };
        });
    },

    lookup: (function(lookupSymbol, data) {
        if (!data.exchange.exch) return [];
        var suffix = data.exchange.yahooSuffix || '';
        return lookupSymbol(data.exchange, data.symbol).then(function(results){
            return results.map(function(result){
                var idx = result.symbol.length - suffix.length;
                var endsWith = suffix && result.symbol.lastIndexOf(suffix) == idx;
                return {
                    ticker: endsWith ? result.symbol.substring(0, idx) : result.symbol,
                    name: result.name
                };
            });
        });
    }).bind(this, lookupSymbol.bind(this, _.memoize(throttlePromise(listSymbols, 2)))),

    security: (function(getSecurity, data) {
        if (!data.security.exchange.exch) return [];
        var suffix = data.security.exchange.yahooSuffix || '';
        return getSecurity(data.security).then(function(result){
            if (!result) return result;
            var idx = result.symbol.length - suffix.length;
            var endsWith = suffix && result.symbol.lastIndexOf(suffix) == idx;
            return _.extend(result, {
                ticker: endsWith ? result.symbol.substring(0, idx) : result.symbol
            });
        });
    }).bind(this, getSecurity.bind(this, queue(loadSecurity, 100))),

    quote: (function(symbolMap, lookupSymbol, loadSymbol, loadCSV, getSecurityQuote, data) {
        var interval = data.interval;
        if ('day' != data.interval && 'week' != data.interval && 'month' != data.interval || !data.security.exchange.exch)
            return {status: 'success', result: []};
        var symbol = guessSymbol(data.security);
        var mapped = symbolMap[symbol];
        return Promise.resolve(mapped || symbol).then(function(symbol){
            if ('week' == interval) return loadPriceTable(loadCSV, data, symbol, 'w');
            else if ('month' == interval) return loadPriceTable(loadCSV, data, symbol, 'm');
            else return loadSymbol(data, symbol).catch(function(error) {
                if (mapped || data.ticker.match(/^[A-Z]+$/))
                    return Promise.reject(error);
                return lookupSymbol(data.security.exchange, data.security.ticker).then(function(results){
                    if (!results.length) return undefined;
                    return results[0].symbol;
                }).then(function(lookup){
                    if (!lookup || symbol == lookup)
                        return Promise.reject(error);
                    symbolMap[symbol] = lookup;
                    console.log("Using Yahoo! symbol " + lookup + " for security " + data.security.exchange.mic + ':' + data.ticker);
                    return loadSymbol(data, lookup);
                });
            }).catch(loadPriceTable.bind(this, loadCSV, data, symbol, 'd')).then(function(result){
                return getSecurityQuote(data.security).then(function(quote){
                    if (!quote.close) return result;
                    else if (_.isEmpty(result) || quote.date != _.first(result).date) {
                        result.unshift(quote);
                    }
                    return result;
                }).catch(function(error){
                    console.log(error);
                    return result;
                });
            });
        }).then(function(result){
            return {
                status: 'success',
                security: data.security,
                interval: interval,
                start: data.start,
                end: data.end,
                result: result
            };
        });
    }).bind(this,
        {},
        lookupSymbol.bind(this, _.memoize(throttlePromise(listSymbols, 2))),
        loadSymbol.bind(this,
            queue(loadQuotes, 100)
        ),
        throttlePromise(cache('yahoo-table', loadCSV, 4*60*60*1000), 2),
        getSecurityQuote.bind(this, queue(loadSecurity, 10))
    )
});

function loadSymbol(loadQuotes, data, symbol){
    if (data.end && data.start > data.end) throw Error(data.start + " is after " + data.end);
    return readStartDate(symbol).then(function(startDate){
        if (data.end && data.end < startDate) return [];
        return loadQuotes([{
            symbol: symbol,
            start: data.start,
            end: data.end,
            marketClosesAt: data.security.exchange.marketClosesAt
        }]).then(function(results){
            if (results && results.length)
                deleteStartDateIfAfter(symbol, results[results.length-1].Date);
            if (results && results.length) return results;
            throw Error("Empty results for " + symbol);
        });
    });
}

function loadQuotes(queue) {
    var filters = [];
    var byFilter = queue.reduce(function(byFilter, item) {
        var end = item.end || new Date().toISOString();
        var endYear = end.substring(0, 4);
        var startYear = item.start.substring(0, 4);
        var start = endYear == startYear ? item.start : (startYear + "-01-01");
        var filter = [
            'startDate="', start.substring(0, 10), '"',
            ' and endDate="', end.substring(0, 10), '"'
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
        return promise.then(function(hash){
            return promiseText(url).then(parseJSON).then(function(result){
                if (result.query.results)
                    return result.query.results.quote;
                return [];
            }).then(function(results){
                if (_.isArray(results)) return results;
                else if (_.isObject(results)) return [results];
                else return [];
            }).then(function(results){
                return results.map(function(result){
                    if (isNaN(parseFloat(result.Close)) && isNaN(parseFloat(result.col6)))
                        throw Error("Not a quote: " + JSON.stringify(result));
                    if (result.Close) return {
                        symbol: result.Symbol,
                        date: result.Date,
                        open: parseCurrency(result.Open),
                        high: parseCurrency(result.High),
                        low: parseCurrency(result.Low),
                        close: parseCurrency(result.Close),
                        volume: parseFloat(result.Volume),
                        adj_close: parseFloat(result.Adj_Close)
                    };
                    else return {
                        symbol: result.Symbol,
                        date: result.col0,
                        open: parseCurrency(result.col1),
                        high: parseCurrency(result.col2),
                        low: parseCurrency(result.col3),
                        close: parseCurrency(result.col4),
                        volume: parseFloat(result.col5),
                        adj_close: parseFloat(result.col6)
                    };
                });
            }).then(function(results){
                return results.reduce(function(hash, result){
                    if (!hash[result.symbol]) hash[result.symbol] = [];
                    hash[result.symbol].push(result);
                    return hash;
                }, hash);
            });
        });
    }, Promise.resolve({})).then(function(hash){
        return queue.map(function(item){
            return hash[item.symbol];
        });
    });
}

function loadPriceTable(loadCSV, data, symbol, g) {
    var now = new Date().toISOString();
    var end = _.first(_.sortBy(_.compact([data.end, now]))).match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
    var endYear = end[1];
    var startYear = data.start.substring(0, 4);
    var startDate = endYear == startYear ? data.start : g != 'w' ? startYear + '-01-01' :
        (function(startYear){
            var date = new Date(startYear + '-01-01');
            date.setDate(date.getDate() - date.getDay() +1);
            return date.toISOString();
        })(startYear);
    var start = startDate.match(/(\d\d\d\d)-(\d\d)-(\d\d)/);
    var url = [
        "http://ichart.finance.yahoo.com/table.csv?s=", encodeURIComponent(symbol),
        "&a=", parseInt(start[2], 10) - 1, "&b=", start[3], "&c=", start[1],
        "&d=", parseInt(end[2], 10) - 1, "&e=", end[3], "&f=", end[1],
        "&g=", g
    ].join('');
    return loadCSV(url).catch(function(error){
        if (error.statusCode == 404) {
            recordStartDate(symbol, end[0]);
            return [];
        }
        return Promise.reject(error);
    }).then(function(results){
        if (results.length && 'd' == g)
            deleteStartDateIfAfter(symbol, results[results.length-1].Date);
        else if (results.length > 1)
            deleteStartDateIfAfter(symbol, results[results.length-2].Date);
        return results.map(function(result, i){
            return {
                symbol: symbol,
                date: result.Date,
                open: parseCurrency(result.Open),
                high: parseCurrency(result.High),
                low: parseCurrency(result.Low),
                close: parseCurrency(result.Close),
                volume: parseFloat(result.Volume),
                adj_close: parseFloat(result['Adj Close']),
                lastTrade: 0 === i ? end[0] : undefined,
                incomplete: 0 === i
            };
        });
    });
}

function parseCurrency(string) {
    return Math.round(parseFloat(string) * 100) / 100;
}

function lookupSymbol(listSymbols, exchange, ticker) {
    var root = ticker.replace(/^\W+/, '').replace(/\W.*$/, '');
    var url = [
        "http://d.yimg.com/aq/autoc?callback=YAHOO.util.ScriptNodeDataSource.callbacks",
        "&lang=", exchange.marketLang,
        "&region=", exchange.marketLang.replace(/.*-/,'') || 'US',
        "&query=", encodeURIComponent(root)
    ].join('');
    return listSymbols(url).then(function(results){
        return results.filter(function(result){
            return result.exch == exchange.exch;
        });
    }).then(function(results){
        if (results.length < 2) return results;
        var last = ticker.charAt(ticker.length - 1);
        var regex = new RegExp('\\b' + ticker.replace(/\W/g, '.*') + '\\b');
        return results.sort(function(a, b){
            if (a.symbol == ticker) return -1;
            if (b.symbol == ticker) return 1;
            var ma = a.symbol.match(regex);
            var mb = b.symbol.match(regex);
            if (ma && !mb) return -1;
            if (!ma && mb) return 1;
            var sa = a.symbol.indexOf(ticker) === 0;
            var sb = b.symbol.indexOf(ticker) === 0;
            if (sa && !sb) return -1;
            if (!sa && sb) return 1;
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
    });
}

function listSymbols(url) {
    return promiseText(url).then(function(jsonp) {
        return jsonp.replace(/^\s*YAHOO.util.ScriptNodeDataSource.callbacks\((.*)\);?\s*$/, '$1');
    }).then(parseJSON).then(function(json) {
        return json.ResultSet.Result.map(function(object){
            return _.mapObject(object, function(value) {
                return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            });
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

function getSecurityQuote(loadSecurity, security) {
    var now = new Date().toISOString();
    return readSecurity(security.symbol || guessSymbol(security)).then(function(result){
        if (result && result.expires > now) return result;
        else return loadSecurity(security);
    });
}

function getSecurity(loadSecurity, security) {
    return readSecurity(security.symbol || guessSymbol(security)).then(function(result){
        if (!_.isEmpty(result)) return result;
        else return loadSecurity(security);
    }).then(function(result){
        return _.extend(result, security);
    });
}

function loadSecurity(securities) {
    if (!_.isArray(securities)) return loadSecurity(writeSecurity, [securities]).then(_.first);
    var symbols = securities.reduce(function(symbols, security){
        symbols[guessSymbol(security)] = security;
        return symbols;
    }, {});
    var now = new Date().toISOString();
    var in5min = new Date(Date.now()+5*60*1000).toISOString();
    var url = "http://download.finance.yahoo.com/d/quotes.csv?f=snxd1t1ol1mv&s="
        + _.keys(symbols).map(encodeURIComponent).join(',');
    return promiseText(url).then(parseCSV).then(function(rows){
        return Promise.all(rows.map(function(row){
            var object = _.object(
                ["symbol", "name", "exch", "date", "time", "open", "close", "range", "volume"], row);
            var m = (object.date + ' ' + object.time).match(/(\d+)\/(\d+)\/(\d+) (\d+):(\d+)(am|pm)/);
            if (!m) return writeSecurity({ // quote N/A
                symbol: object.symbol,
                name: object.name,
                exch: object.exch,
                open: undefined,
                high: undefined,
                low: undefined,
                close: undefined,
                volume:undefined,
                adj_close: undefined,
                date: undefined,
                lastTrade: undefined,
                tz: 'America/New_York',
                expires: in5min,
                incomplete: true
            });
            var hour = 'pm' == m[6] && 12 > +m[4] ? 12 + +m[4] : m[4];
            var date = (m[3]+'-'+m[1]+'-'+m[2]).replace(/\b(\d)\b/g,'0$1');
            var lastTrade = date + ' ' + (hour+':'+m[5]+':00').replace(/\b(\d)\b/g,'0$1');
            var low = object.range.replace(/[^\d\.].*$/,'');
            var high = object.range.replace(/^.*[^\d\.]/,'');
            return writeSecurity({
                symbol: object.symbol,
                name: object.name,
                exch: object.exch,
                open: _.isFinite(object.open) ? +object.open : undefined,
                high: _.isFinite(high) ? +high : undefined,
                low: _.isFinite(low) ? +low : undefined,
                close: _.isFinite(object.close) ? +object.close : undefined,
                volume: _.isFinite(object.volume) ? +object.volume : undefined,
                adj_close: +object.close,
                date: date,
                lastTrade: lastTrade,
                tz: 'America/New_York',
                expires: in5min,
                incomplete: true
            });
        }));
    }).then(function(list){
        return list.reduce(function(hash, security){
            hash[security.symbol] = security;
            return hash;
        }, {});
    }).then(function(hash){
        return securities.map(function(security){
            return hash[guessSymbol(security)];
        });
    });
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
                        notifications[i].resolve(result[i]);
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

function guessSymbol(security) {
    return security.ticker
        .replace(/\^/, '-P')
        .replace(/[\.\-\/]/, '-')
        .replace(/-PR./, '-P')
        .replace(/\./g, '') +
        (security.exchange.yahooSuffix ? security.exchange.yahooSuffix : '');
}

function recordStartDate(symbol, date) {
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
            return writeStartDate(symbol, startDate);
        } else {
            // recent symbol data is not available, blacklist until tomorrow
            var tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return writeStartDate(symbol, tomorrow);
        }
    }, function(error){
        if (error.statusCode == 404 && end.valueOf() < Date.now()) {
            // keep searching for startDate, one month at a time
            return recordStartDate(symbol, formatDate(end));
        } else if (error.statusCode == 404) {
            // ignore any future requests for this symbol for one month
            var nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return writeStartDate(symbol, nextMonth);
        } else {
            return Promise.reject(error);
        }
    });
}

function writeStartDate(symbol, date) {
    if (_.isDate(date)) return writeStartDate(symbol, formatDate(date));
    return writeSecurity({symbol: symbol, inception: date});
}

function formatDate(date) {
    return [date.getFullYear(), date.getMonth()+1, date.getDate()].join('-');
}

function writeSecurity(security) {
    return openSecurityDatabase('readwrite', function(store, resolve, reject){
        var request = store.get(security.symbol);
        request.onerror = reject;
        request.onsuccess = function(event){
            var object = _.extend(event.target.result || {}, security);
            var request = store.put(object, security.symbol);
            request.onerror = reject;
            request.onsuccess = function(){
                resolve(object);
            };
        };
    });
}

function deleteStartDateIfAfter(symbol, date) {
    return openSecurityDatabase('readwrite', function(store, resolve, reject){
        var request = store.get(symbol);
        request.onerror = reject;
        request.onsuccess = function(event){
            var security = event.target.result;
            if (security && date < security.inception) {
                var request = store.put(_.omit(security, 'inception'), symbol);
                request.onerror = reject;
                request.onsuccess = resolve;
            } else {
                resolve();
            }
        };
    });
}

function readStartDate(symbol) {
    return readSecurity(symbol).then(function(security){
        return security.inception;
    });
}

function readSecurity(symbol) {
    return openSecurityDatabase('readonly', function(store, resolve, reject){
        var request = store.get(symbol);
        request.onsuccess = resolve;
        request.onerror = reject;
    }).then(function(event){
        return event.target.result;
    });
}

function openSecurityDatabase(mode, callback) {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open('yahoo-quote', 2);
        request.onerror = reject;
        request.onupgradeneeded = function(event) {
            var db = event.target.result;
            // Clear the database to re-download everything
            for (var i=db.objectStoreNames.length -1; i>=0; i--) {
                var name = db.objectStoreNames[i];
                db.deleteObjectStore(db.objectStoreNames[i]);
            }
            db.createObjectStore('security');
        };
        request.onsuccess = function(event){
            try {
                var db = event.target.result;
                var trans = db.transaction(['security'], mode);
                return callback(trans.objectStore('security'), resolve, reject);
            } catch(e) {
                reject(e);
            }
        };
    });
}

function loadCSV(url){
    return promiseText(url).then(parseCSV).then(rows2objects);
}

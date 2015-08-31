// test-helper.js
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

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

var exchanges = [
  {
    "iri": "http://localhost/exchanges/arcx",
    "label": "Archipelago Electronic Communications Network",
    "marketOpensAt": "09:30:00",
    "marketClosesAt": "16:00:00",
    "premarketOpensAt": "04:00:00",
    "afterHoursClosesAt": "20:00:00",
    "tz": "America/New_York",
    "marketLang": "en-US",
    "mic": "ARCX",
    "morningstarCode": "XNYS",
    "exch": "PCX",
    "yahooSuffix": null,
    "dtnPrefix": null
  },
  {
    "iri": "http://localhost/exchanges/ncm",
    "label": "NASDAQ Capital Market",
    "marketOpensAt": "09:30:00",
    "marketClosesAt": "16:00:00",
    "premarketOpensAt": "04:00:00",
    "afterHoursClosesAt": "20:00:00",
    "tz": "America/New_York",
    "marketLang": "en-US",
    "mic": "XNCM",
    "morningstarCode": "XNAS",
    "exch": "NCM",
    "yahooSuffix": null,
    "dtnPrefix": null
  },
  {
    "iri": "http://localhost/exchanges/ngm",
    "label": "NASDAQ Global Market",
    "marketOpensAt": "09:30:00",
    "marketClosesAt": "16:00:00",
    "premarketOpensAt": "04:00:00",
    "afterHoursClosesAt": "20:00:00",
    "tz": "America/New_York",
    "marketLang": "en-US",
    "mic": "XNMS",
    "morningstarCode": "XNAS",
    "exch": "NGM",
    "yahooSuffix": null,
    "dtnPrefix": null
  },
  {
    "iri": "http://localhost/exchanges/ngs",
    "label": "NASDAQ Global Select Market",
    "marketOpensAt": "09:30:00",
    "marketClosesAt": "16:00:00",
    "premarketOpensAt": "04:00:00",
    "afterHoursClosesAt": "20:00:00",
    "tz": "America/New_York",
    "marketLang": "en-US",
    "mic": "XNGS",
    "morningstarCode": "XNAS",
    "exch": "NMS",
    "yahooSuffix": null,
    "dtnPrefix": null
  },
  {
    "iri": "http://localhost/exchanges/amex",
    "label": "NYSE MKT LLC",
    "marketOpensAt": "09:30:00",
    "marketClosesAt": "16:00:00",
    "premarketOpensAt": "04:00:00",
    "afterHoursClosesAt": "20:00:00",
    "tz": "America/New_York",
    "marketLang": "en-US",
    "mic": "XASE",
    "morningstarCode": "XASE",
    "exch": "ASE",
    "yahooSuffix": null,
    "dtnPrefix": null
  },
  {
    "iri": "http://localhost/exchanges/nyse",
    "label": "New York Stock Exchange",
    "marketOpensAt": "09:30:00",
    "marketClosesAt": "16:00:00",
    "premarketOpensAt": "04:00:00",
    "afterHoursClosesAt": "20:00:00",
    "tz": "America/New_York",
    "marketLang": "en-US",
    "mic": "XNYS",
    "morningstarCode": "XNYS",
    "exch": "NYQ",
    "yahooSuffix": null,
    "dtnPrefix": null
  },
  {
    "iri": "http://localhost/exchanges/tsx-v",
    "label": "TSX Venture Exchange",
    "marketOpensAt": "09:30:00",
    "marketClosesAt": "16:00:00",
    "premarketOpensAt": "09:30:00",
    "afterHoursClosesAt": "16:00:00",
    "tz": "America/Toronto",
    "marketLang": "en-CA",
    "mic": "XTSX",
    "morningstarCode": "XTSX",
    "exch": "VAN",
    "yahooSuffix": ".V",
    "dtnPrefix": "C."
  },
  {
    "iri": "http://localhost/exchanges/tsx",
    "label": "Toronto Stock Exchange",
    "marketOpensAt": "09:30:00",
    "marketClosesAt": "16:00:00",
    "premarketOpensAt": "09:30:00",
    "afterHoursClosesAt": "16:00:00",
    "tz": "America/Toronto",
    "marketLang": "en-CA",
    "mic": "XTSE",
    "morningstarCode": "XTSE",
    "exch": "TOR",
    "yahooSuffix": ".TO",
    "dtnPrefix": "C."
  }
];
var screener = {
            validate: function(expression, interval) {
                var int = interval && interval.indexOf('/') ? interval.substring(interval.lastIndexOf('/') + 1) : interval;
                return postDispatchMessage({
                    cmd: 'validate',
                    expression: expression,
                    interval: {value: int}
                });
            },
            listExchanges: function() {
                return Promise.resolve(exchanges);
            },

            listSectors: _.memoize(function(exchange) {
                if (!exchange) return Promise.resolve([]);
                return postDispatchMessage({
                    cmd: 'sector-list',
                    exchange: getExchange(exchange)
                });;
            }),

            listSecurities: function(exchange, sectors, mincap, maxcap) {
                return Promise.all((_.isString(sectors) ? [sectors] : sectors).map(function(sector){
                    return postDispatchMessage({
                        cmd: 'security-list',
                        exchange: getExchange(exchange),
                        sector: sector,
                        mincap: mincap,
                        maxcap: maxcap
                    });
                })).then(_.flatten);
            },

            load: function(security, expressions, interval, length, lower, upper) {
                if (length < 0 || length != Math.round(length)) throw Error("length must be a non-negative integer, not " + length);
                if (!interval) throw Error("interval is required, not " + interval);
                var int = interval.indexOf('/') ? interval.substring(interval.lastIndexOf('/') + 1) : interval;
                return getExchangeOfSecurity(security).then(function(exchange){
                    return postDispatchMessage({
                        cmd: 'load',
                        exchange: exchange,
                        security: security,
                        expressions: expressions,
                        interval: {value: int},
                        length: length,
                        lower: lower,
                        upper: upper || lower
                    });
                });
            },

            screen: function(securityClasses, screen, asof, until, load) {
                return postDispatchMessage({
                    cmd: 'screen',
                    begin: asof,
                    end: until,
                    load: load,
                    securityClasses: securityClasses,
                    screen: screen
                }).catch(function(data){
                    if (load !== false && data.status == 'warning')
                        return data.result;
                    else return Promise.reject(data);
                });
            },

            signals: function(securityClasses, screen, asof, until, load) {
                return postDispatchMessage({
                    cmd: 'signals',
                    begin: asof,
                    end: until,
                    load: load,
                    securityClasses: securityClasses,
                    screen: screen
                }).catch(function(data){
                    if (load !== false && data.status == 'warning')
                        return data.result;
                    else return Promise.reject(data);
                });
            }
};

    function getExchange(iri) {
        return _.first(exchanges.filter(function(exchange) {
            return _.values(exchange).indexOf(iri) >= 0;
        }));
    }

    function getExchangeOfSecurity(security) {
        return screener.listExchanges().then(function(exchanges){
            var filtered = _.values(exchanges).filter(function(exchange){
                return security.indexOf(exchange.iri) === 0 && security.charAt(exchange.iri.length) == '/';
            });
            if (filtered.length == 1) return filtered[0];
            if (filtered.length) throw Error("Security matches too many exchanges: " + filtered);
            throw Error("Unknown security: " + security);
        });
    }

function postDispatchMessage(data) {
    var ws = new WebSocket(window.location.href.replace('http', 'ws'));
    return new Promise(function(callback) {
        ws.addEventListener('open', callback);
    }).then(function() {
        return new Promise(function(callback){
            ws.addEventListener('message', callback);
            console.log(data);
            ws.send(JSON.stringify(data)+'\n\n');
        });
    }).then(function(event){
        var data = JSON.parse(event.data);
        console.log(data);
        if (data && data.status == 'success' && data.result) {
            return data.result;
        } else if (data && data.status == 'success') {
            return data;
        } else {
            return Promise.reject(data);
        }
    }).then(function(data) {
        ws.close();
        return data;
    }, function(error) {
        ws.close();
        return Promise.reject(error);
    });
}

function roundTripBacktestAsOf(date) {
    return function(){
        screener.setBacktestAsOf(date);
        expect(screener.getBacktestAsOf()).toEqual(date);
    };
}

function rejectBacktestAsOf(date) {
    return function(){
        expect(function(){
            screener.setBacktestAsOf(date);
        }).toThrow();
    };
}

function ignoreBacktestAsOf(date) {
    return function(){
        localStorage.removeItem('backtest-as-of');
        sessionStorage.setItem('backtest-as-of', date);
        expect(screener.getBacktestAsOf()).not.toEqual(date);
    };
}

function isValid(/* intervals */) {
    var intervals =  Array.prototype.slice.call(arguments, 0);
    return function(expression){
        return function(done){
            Promise.all(intervals.map(function(interval){
                return screener.validate(expression, interval).then(function(result){
                    expect(result).not.toBe(undefined);
                });
            })).then(done, unexpected(done));
        };
    };
}

function isInvalid(/* intervals */) {
    var intervals =  Array.prototype.slice.call(arguments, 0);
    return function(expression) {
        return function(done){
            Promise.all(intervals.map(function(interval){
                return screener.validate(expression).then(unexpected(done)).catch(function(data){
                    expect(data.status).toBe('error');
                    expect(data.message).toBeTruthy();
                    expect(data.expression).toEqual(expression);
                });
            })).then(done, unexpected(done));
        };
    };
}

function listExchangeShouldInclude(mic) {
    return function(done){
        screener.listExchanges().then(function(exchanges){
            return _.difference([], _.pluck(exchanges, 'mic'));
        }).then(function(missing){
            expect(missing).toEqual([]);
        }).then(done, unexpected(done));
    };
}

function checkSectorListing(mics, expectedSectors) {
    return function(done) {
        screener.listExchanges().then(_.values).then(function(result){
            expect(result.length).not.toBe(0);
            return result.filter(function(exchange){
                return mics.indexOf(exchange.mic) >= 0;
            });
        }).then(_.partial(_.pluck, _, 'iri')).then(function(exchanges) {
            return Promise.all(exchanges.map(function(exchange){
                return screener.listSectors(exchange).then(function(result){
                    expect(result).toEqual(expectedSectors);
                });
            }));
        }).then(done, unexpected(done));
    };
}

function checkCompanyListing(mic, sector, ticker) {
    return function(done) {
        screener.listExchanges().then(_.values).then(function(result){
            expect(result.length).not.toBe(0);
            return result.filter(function(exchange){
                return mic == exchange.mic;
            });
        }).then(_.partial(_.pluck, _, 'iri')).then(_.first).then(function(exchange) {
            return screener.listSecurities(exchange, sector).then(function(result){
                expect(result).toContain(exchange + '/' + ticker);
            });
        }).then(done, unexpected(done));
    };
}

function checkCompanyMarketCap(mic, sector, mincap, maxcap, ticker) {
    return function(done) {
        screener.listExchanges().then(_.values).then(function(result){
            expect(result.length).not.toBe(0);
            return result.filter(function(exchange){
                return mic == exchange.mic;
            });
        }).then(_.partial(_.pluck, _, 'iri')).then(_.first).then(function(exchange) {
            return screener.listSecurities(exchange, sector, mincap, maxcap).then(function(result){
                expect(result).toContain(exchange + '/' + ticker);
                return exchange;
            });
        }).then(function(exchange) {
            if (!mincap) return exchange;
            return screener.listSecurities(exchange, sector, 0, mincap).then(function(result){
                expect(result).not.toContain(exchange + '/' + ticker);
                return exchange;
            });
        }).then(function(exchange) {
            if (!maxcap || maxcap == Infinity) return exchange;
            return screener.listSecurities(exchange, sector, maxcap).then(function(result){
                expect(result).not.toContain(exchange + '/' + ticker);
                return exchange;
            });
        }).then(done, unexpected(done));
    };
}

function loadQuotesWithError(errorMessage) {
    return function(mic, ticker, expressions, length, interval, asof) {
        return function(done) {
            screener.listExchanges().then(_.values).then(function(result){
                expect(result.length).not.toBe(0);
                return result.filter(function(exchange){
                    return mic == exchange.mic;
                });
            }).then(function(exchanges){
                return exchanges[0].iri + '/' + encodeURI(ticker);
            }).then(function(security){
                return screener.load(security, expressions, interval, length, asof);
            }).then(function(data) {
                return data.map(function(result) {
                    return expressions.map(function(expression){
                        return result[expression];
                    });
                });
            }).then(unexpected(done)).catch(function(data){
                expect(data.status).not.toBe('success');
                expect(data.message).toBe(errorMessage);
            }).then(done, unexpected(done));
        };
    };
}

function loadQuotes(mic, ticker, expressions, length, interval, asof, rows) {
    return function(done) {
        screener.listExchanges().then(_.values).then(function(result){
            expect(result.length).not.toBe(0);
            return result.filter(function(exchange){
                return mic == exchange.mic;
            });
        }).then(function(exchanges){
            return exchanges[0].iri + '/' + encodeURI(ticker);
        }).then(function(security){
            return screener.load(security, expressions, interval, length, asof);
        }).then(function(data) {
            return data.map(function(result) {
                return expressions.map(function(expression){
                    return result[expression];
                });
            });
        }).then(function(result){
            expect(result.length).toBe(length);
            for (var i=0; i<length; i++) {
                if (rows[i]) expect(result[i]).toBeTruthy();
                else expect(result[i]).toBeFalsy();
                expect(result[i].length).toBe(rows[i].length);
                for (var j=0; j<rows[i].length; j++) {
                    if (rows[i][j] && !result[i][j]) expect(expressions[j]).toBe(rows[i][j]);
                    else if (!rows[i][j] && result[i][j]) expect(expressions[j]).toBeFalsy();
                }
            }
            expect(result).toEqual(rows);
        }).then(done, unexpected(done));
    };
}

function signalsCheck(securityClasses, screen, begin, end, points) {
    return function(done) {screener.listExchanges().then(_.values).then(function(result){
            expect(result.length).not.toBe(0);
            return result;
        }).then(function(exchanges){
            return _.indexBy(_.values(exchanges), 'mic');
        }).then(function(exchanges){
            var lists = securityClasses.map(function(securityClass){
                return _.extend({}, securityClass, {
                    exchange: exchanges[securityClass.ofExchange],
                    includes: securityClass.includes.map(function(symbol){
                        var mic = symbol.substring(0, symbol.indexOf(':'));
                        var prefix = exchanges[mic].iri;
                        return prefix + '/' + encodeURI(symbol.substring(symbol.indexOf(':') + 1));
                    })
                });
            });
            return screener.signals(lists, screen, begin, end).then(function(result){
                var expected = points.map(function(point){
                    var symbol = point.symbol;
                    var mic = symbol.substring(0, symbol.indexOf(':'));
                    var prefix = exchanges[mic].iri;
                    var security = prefix + '/' + encodeURI(symbol.substring(symbol.indexOf(':') + 1));
                    return _.extend({}, _.omit(point, 'symbol'), {
                        security: security
                    });
                });
                expect(result.length).toEqual(expected.length);
                expected.forEach(function(point, i){
                    for (var key in point) {
                        if (typeof point[key] == 'object') {
                            expect(result[i][key]).toEqual(jasmine.objectContaining(point[key]));
                        } else {
                            expect(result[i][key]).toEqual(point[key]);
                        }
                    }
                });
            });
        }).then(done, unexpected(done));
    };
}

function screenIterator(exchange, ticker, expressions, length, interval, asof, rows) {
    return function(done){
        var iter = screener.screen([{
            ofExchange: exchange,
            excludes:"",
            includes:ticker
        }],[{
            filters:expressions.map(function(expression){
                return {
                    indicator:{
                        expression: expression,
                        interval: {value: interval}
                    }
                };
            })
        }], asof, asof);
        Promise.all(rows.map(function(row){
            return iter.next().value.then(function(result){
                expect(result).not.toEqual([]);
                result.forEach(function(point){
                    expect(point.security).toMatch(ticker);
                    expressions.forEach(function(expression, index){
                        expect(point[expression]).toEqual(row[index]);
                    });
                });
            });
        })).then(done, unexpected(done));
    };
}

function these(message, list, func) {
    _.each(list, function(value) {
        var call = _.isArray(value) ? 'apply' : 'call';
        it(message, func[call](this, value));
    });
}

function xthese(message, list, func) {
    _.each(list, function(value) {
        var call = _.isArray(value) ? 'apply' : 'call';
        xit(message, func[call](this, value));
    });
}

function unexpected(done){
    return function(data) {
        console.log(data);
        if (data.stack) {
            expect(data.stack).toBe(undefined);
        }
        expect(data).toBe(undefined);
        expect("should not have been called").toBe(undefined);
        done();
    };
}

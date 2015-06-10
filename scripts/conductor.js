// conductor.js
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
/*
 * Does not access IndexedDB directly, but handles data assembly/screening and
 * builds requested dataset based on sub messages sent to other workers
 */

dispatch({
    stop: function() {
        self.close();
    },

    ping: function() {
        return 'pong';
    },

    rollcall: function() {
        return Promise.all(_.map(services, function(workers, service) {
            return Promise.all(_.map(workers, function(worker, index) {
                return worker.promiseMessage("ping").then(function(data){
                    return worker.name;
                });
            }));
        })).then(function(result){
            return _.object(_.keys(services), result);
        });
    },

    validate: (function(services, data){
        var interval = data.interval;
        var key = getWorker(services.mentat, data.expression);
        return services.mentat[key].promiseMessage({
            cmd: 'fields',
            expressions: [data.expression]
        }).then(function(data){
            return data.result;
        }).then(function(fields){
            return Promise.all(_.map(services.quote, function(quote, key){
                return quote.promiseMessage({
                    cmd: 'validate',
                    interval: interval,
                    fields: _.without(fields, 'asof')
                }).catch(Promise.resolve.bind(Promise));
            }));
        }).then(function(results){
            return results.filter(function(result){
                return result.status == 'success' || result.message;
            });
        }).then(function(results){
            if (!results.length) throw new Error("Unknown interval: " + data.interval);
            return results;
        }).then(function(results){
            if (_.every(results, function(result){
                return result.status != 'success';
            })) return results[0];
            return results.filter(function(result){
                return result.status == 'success';
            })[0];
        });
    }).bind(this, services),

    increment: function(data) {
        var worker = getWorker(services.mentat, data.asof.toString());
        return services.mentat[worker].promiseMessage(data);
    },

    'sector-list': serviceMessage.bind(this, services, 'list'),

    'security-list': serviceMessage.bind(this, services, 'list'),

    load: (function(services, data) {
        validate(data.exchange, 'data.exchange', isExchange);
        var worker = getWorker(services.mentat, data.security);
        return retryAfterImport(services, data, services.mentat[worker]).then(function(data){
            return data.result;
        });
    }).bind(this, services),

    reset: (function(services, data) {
        var m = serviceMessage(services, 'mentat', data);
        var q = serviceMessage(services, 'quote', data);
        return Promise.all([m, q]).then(combineResult);
    }).bind(this, services),

    screen: function(data) {
        validate(data.watchLists, 'data.watchLists', isArrayOf(isWatchList));
        validate(data.screens, 'data.screens', isArrayOf(isScreen));
        return screenSecurities(services, data.watchLists, data.screens, data.begin, data.end, data.load);
    },

    signal: function(data){
        validate(data.watchLists, 'data.watchLists', isArrayOf(isWatchList));
        return signal(services, intervals, data.watchLists, data.entry, data.exit, data.begin, data.end);
    },

    performance: function(data){
        validate(data.watchLists, 'data.watchLists', isArrayOf(isWatchList));
        return signal(services, intervals, data.watchLists, data.entry, data.exit, data.begin, data.end).then(function(data){
            return data.result;
        }).then(function(signals){
            var returns = _.reduce(_.groupBy(signals, 'security'), function(returns, signals, security){
                var entry = null;
                return signals.reduce(function(returns, exit, i, signals){
                    if (!entry && (exit.signal == 'buy' || exit.signal == 'sell')) {
                        entry = exit;
                    } else if (entry.signal == 'sell' && exit.signal == 'buy') {
                        returns.push((entry.price - exit.price) / entry.price);
                        entry = null;
                    } else if (entry.signal == 'buy' && exit.signal == 'sell') {
                        returns.push((exit.price - entry.price) / entry.price);
                        entry = null;
                    }
                    return returns;
                }, returns);
            }, []);
            var rate = sum(returns);
            var avg = rate / returns.length;
            var sd = Math.sqrt(sum(returns.map(function(num){
                var diff = num - avg;
                return diff * diff;
            })) / Math.max(returns.length-1,1));
            return {
                status: 'success',
                result: {
                    rate: rate,
                    sd: sd === 0 ? 1 : sd,
                    amount: returns.length
                }
            };
        });
    }
});

function sum(numbers) {
    return numbers.reduce(function(sum, num){
        return sum + num;
    }, 0);
}

function signal(services, intervals, watchLists, entry, exit, begin, end) {
    var byExchange = _.groupBy(watchLists, _.compose(_.property('iri'), _.property('exchange')));
    return Promise.all(_.map(byExchange, function(watchLists) {
        var exchange = watchLists[0].exchange;
        return listSecurities(services, watchLists).then(function(securities){
            return Promise.all(securities.map(function(security){
                return findSignals(services, exchange, security, entry, exit, begin, end);
            }));
        });
    })).then(_.flatten).then(function(signals){
        var error = signals.filter(_.property('status'));
        var result = signals.filter(_.property('signal'));
        if (!error.length) return {
            status: 'success',
            result: result
        };
        else if (!result.length) return Promise.reject({
            status: 'error',
            message: _.uniq(_.pluck(error, 'message').sort(), true).join('\n'),
            error: error
        });
        else return {
            status: 'warning',
            result: result,
            message: _.uniq(_.pluck(error, 'message').sort(), true).join('\n'),
            error: error
        };
    });
}

function findSignals(services, exchange, security, entry, exit, begin, end) {
    var worker = getWorker(services.mentat, security);
    return retryAfterImport(services, {
        cmd: 'signal',
        begin: begin,
        end: end,
        entry: entry,
        exit: exit,
        exchange: exchange,
        security: security
    }, services.mentat[worker]).then(function(data){
        return data.result;
    }).catch(function(error){
        console.log("Could not load", security, error.status, error);
        return normalizedError(error);
    });
}

function screenSecurities(services, watchLists, screens, begin, end, load) {
    var byExchange = _.groupBy(watchLists, _.compose(_.property('iri'), _.property('exchange')));
    return Promise.all(_.map(byExchange, function(watchLists) {
        var exchange = watchLists[0].exchange;
        var filter = filterSecurity.bind(this, services, screens, begin, end, load, exchange);
        return listSecurities(services, watchLists).then(function(securities) {
            return Promise.all(securities.map(filter));
        });
    })).then(_.flatten).then(function(result) {
        var groups = _.groupBy(_.compact(result), function(obj){
            return obj.status && obj.status != 'success' ? 'error' : 'result';
        });
        var success = _.keys(groups).indexOf('error') < 0;
        var warning =  groups.result && groups.error;
        return _.extend({
            status: success ? 'success' : warning ? 'warning' : 'error',
            message: groups.error && _.uniq(_.pluck(groups.error, 'message').sort(), true).join('\n')
        }, success ? {result: []} : {}, groups);
    }).then(function(data){
        if (data.status != 'error' && data.result) return data;
        return Promise.reject(data);
    });
}

function listSecurities(services, watchLists) {
    return Promise.all(watchLists.map(function(watchList){
        return Promise.resolve(watchList).then(function(watchList){
            if (!watchList.includeSectors)
                return [];
            return Promise.all(watchList.includeSectors.map(function(sector){
                return serviceMessage(services, 'list', {
                    cmd: 'security-list',
                    exchange: watchList.exchange,
                    sector: sector,
                    mincap: watchList.mincap,
                    maxcap: watchList.maxcap
                }).then(_.property('result'));
            }));
        }).then(_.flatten).then(function(result){
            var includes = watchList.includes || [];
            var excludes = watchList.excludes || [];
            return includes.concat(_.difference(result, excludes));
        });
    })).then(_.flatten).then(_.uniq);
}

function filterSecurity(services, screens, begin, end, load, exchange, security){
    var worker = getWorker(services.mentat, security);
    return retryAfterImport(services, {
        cmd: 'screen',
        begin: begin,
        end: end,
        screens: screens,
        exchange: exchange,
        security: security
    }, services.mentat[worker], load).then(function(data){
        return data.result;
    }).catch(function(error){
        console.log("Could not load", security, error.status, error);
        return normalizedError(error);
    });
}

function retryAfterImport(services, data, port, load) {
    return port.promiseMessage(_.extend({
        failfast: load !== false
    }, data)).catch(function(error){
        if (load === false && error.quote && error.status == 'warning')
            return error; // just use what we have
        if (!error.quote || load === false)
            return Promise.reject(error);
        // try to load more
        return importAndRun(services, data, port, error.quote);
    });
}

function importAndRun(services, data, port, quotes) {
    var exchange = data.exchange;
    var ticker = decodeURI(data.security.substring(exchange.iri.length + 1));
    return importQuotes(services, exchange, ticker, quotes, port).then(function(imported){
        return port.promiseMessage(data).catch(function(error){
            var exclude = _.uniq(quotes.map(_.property('interval')));
            var intervals = error.quote && _.uniq(error.quote.map(_.property('interval')));
            if (intervals && !_.some(intervals, _.contains.bind(_, exclude))) {
                // asking for different invervals this time
                return importAndRun(services, data, port, error.quote);
            } else if (error.status == 'warning') {
                // just use what we have
                return Promise.resolve(error);
            } else {
                return Promise.reject(error);
            }
        });
    });
}

function importQuotes(services, exchange, ticker, quotes, port) {
    return Promise.all(quotes.map(function(request){
        return Promise.all(_.map(services.quote, function(quote, quoteName){
            return quote.promiseMessage(_.extend({
                cmd: 'quote',
                exchange: exchange,
                ticker: ticker
            }, request)).then(function(data){
                return data.result;
            }).then(function(result){
                if (result.length === 0) return null;
                if (result[0].close !== undefined && isNaN(result[0].close))
                    throw Error("Data is NaN " + JSON.stringify(result[0]));
                return port.promiseMessage({
                    cmd: 'import',
                    security: request.security,
                    interval: request.interval,
                    exchange: exchange,
                    points: result
                });
            });
        }));
    })).then(_.flatten).then(_.compact);
}

function serviceMessage(services, name, data) {
    if (!services[name] || !_.keys(services[name]).length)
        throw new Error('No ' + name + ' service registered');
    return Promise.all(_.map(services[name], function(service, key) {
        return service.promiseMessage(data);
    })).then(combineResult);
}

function combineResult(results){
    return _.reduce(results, function(memo, msg) {
        var result = msg.result.concat(memo.result);
        return _.extend(memo, msg, {result: result});
    }, {result: []});
}

var throttledLog = _.throttle(console.log.bind(console), 1000);
function getWorker(workers, string) {
    var keys = _.keys(workers);
    var mod = keys.length;
    var w = (hashCode(string) % mod + mod) % mod;
    var key = keys[w];
    throttledLog("Called worker ", key);
    return key;
}

function hashCode(str){
    var hash = 0, i, char;
    if (str.length === 0) return hash;
    for (i = 0, l = str.length; i < l; i++) {
        char = str.charCodeAt(i);
        hash = char + (hash << 6) + (hash << 16) - hash;
    }
    return hash;
}

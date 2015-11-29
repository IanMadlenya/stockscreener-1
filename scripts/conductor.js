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

    workload: function() {
        return Promise.all(_.map(services, function(workers, service) {
            return Promise.all(_.map(workers, function(worker, index) {
                return _.values(worker.workload);
            }));
        })).then(function(result){
            return _.object(_.keys(services), result);
        });
    },

    profile: function(data){
        return new Promise(function(callback){
            chrome.storage.local.get(["launch"], callback);
        }).then(function(items){
            if (!data.launch || items.launch == data.launch || data.launch.indexOf(items.launch) === 0)
                return {status: "success", result: items.launch};
            else if (items.launch && data.launch)
                throw Error("Reinstall Chrome App to change profile");
            else return new Promise(function(callback){
                console.log("Setting launch profile " + data.launch);
                chrome.storage.local.set({launch: data.launch}, callback);
            }).then(function(){
                return {status: "success", result: data.launch};
            });
        });
    },

    validate: (function(services, data){
        validate(data.interval, 'data.interval', isInterval);
        var derivedFrom = intervals[data.interval.value].derivedFrom;
        var interval = derivedFrom ? derivedFrom : data.interval;
        return Promise.resolve(data).then(function(data){
            if (!data.expression) return [];
            var key = getWorker(services.mentat, data.expression);
            return services.mentat[key].promiseMessage({
                cmd: 'fields',
                expressions: [data.expression]
            }).then(function(data){
                return data.result;
            });
        }).then(function(fields){
            return Promise.all(_.map(services.quote, function(quote, key){
                return quote.promiseMessage({
                    cmd: 'validate',
                    interval: interval.value,
                    fields: _.without(fields, 'asof')
                }).catch(Promise.resolve.bind(Promise));
            }));
        }).then(function(results){
            return results.filter(function(result){
                return result.status == 'success' || result.message;
            });
        }).then(function(results){
            if (!results.length) throw new Error("Unknown interval: " + data.interval.value);
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

    'indicator-list': function() {
        return Promise.all(_.values(intervals).map(function(interval){
            return Promise.all(_.map(services.quote, function(quote, key){
                return quote.promiseMessage({
                    cmd: 'validate',
                    interval: interval.value
                }).catch(Promise.resolve.bind(Promise));
            }));
        })).then(_.flatten).then(function(results){
            return _.pluck(results.filter(function(result){
                return result.status == 'success';
            }), 'interval');
        }).then(_.uniq).then(_.compact).then(function(result){
            return _.sortBy(_.keys(intervals).filter(function(interval){
                var derivedFrom = intervals[interval].derivedFrom;
                return _.contains(result, interval) || derivedFrom && _.contains(result, derivedFrom.value);
            }), function(interval){
                return intervals[interval].millis;
            });
        });
    },

    'interval-list': function() {
        return Promise.all(_.values(intervals).map(function(interval){
            return Promise.all(_.map(services.quote, function(quote, key){
                return quote.promiseMessage({
                    cmd: 'validate',
                    interval: interval.value
                }).catch(Promise.resolve.bind(Promise));
            }));
        })).then(_.flatten).then(function(results){
            return _.pluck(results.filter(function(result){
                return result.status == 'success';
            }), 'interval');
        }).then(_.uniq).then(_.compact).then(function(result){
            return _.sortBy(_.keys(intervals).filter(function(interval){
                var derivedFrom = intervals[interval].derivedFrom;
                return _.contains(result, interval) || derivedFrom && _.contains(result, derivedFrom.value);
            }), function(interval){
                return intervals[interval].millis;
            });
        });
    },

    'sector-list': serviceMessage.bind(this, services, 'list'),

    'industry-list': serviceMessage.bind(this, services, 'list'),

    'country-list': serviceMessage.bind(this, services, 'list'),

    'security-list': serviceMessage.bind(this, services, 'list'),

    lookup: function(data) {
        validate(data.exchange, 'data.exchange', isExchange);
        validate(data.symbol, 'data.symbol', _.isString);
        return serviceMessage(services, 'quote', data).then(function(resp){
            return _.extend(resp, {
                result: resp.result.map(function(security){
                    return _.extend(security, {
                        iri: data.exchange.iri + '/' + encodeURI(security.ticker)
                    });
                })
            });
        });
    },

    security: function(data) {
        validate(data.security, 'data.security', isSecurity);
        return serviceMessage(services, 'quote', data).then(function(resp){
            return _.extend(resp, {
                result: _.first(resp.result)
            });
        });
    },

    load: (function(services, data) {
        validate(data.security, 'data.security', isSecurity);
        validate(data.interval, 'data.interval', isInterval);
        validate(data.length, 'data.length', _.isFinite);
        validate(data.lower, 'data.lower', isISOString);
        validate(data.upper, 'data.upper', isISOString);
        var incomplete = chrome.runtime.getManifest().permissions.indexOf('notifications') >= 0;
        return retryAfterImport(services, incomplete, data);
    }).bind(this, services),

    reset: (function(services, data) {
        var m = serviceMessage(services, 'mentat', data);
        var q = serviceMessage(services, 'quote', data);
        return Promise.all([m, q]).then(combineResult);
    }).bind(this, services),

    signals: function(data) {
        validate(data.securityClass, 'data.securityClass', isSecurityClass);
        validate(data.criteria, 'data.criteria', isArrayOf(isCriteria));
        validate(data.begin, 'data.begin', isISOString);
        validate(data.begin, 'data.end', isISOString);
        var incomplete = chrome.runtime.getManifest().permissions.indexOf('notifications') >= 0;
        return promiseSecurities(services, data.securityClass, function(security, i, securities) {
            return promiseSignals(services, incomplete && securities.length < 100, {
                cmd: 'signals',
                begin: data.begin,
                end: data.end,
                criteria: data.criteria,
                security: security,
                correlated: data.securityClass.correlated
            }, data.load).catch(function(error){
                console.log("Could not load", security.ticker, error.status, error);
                return normalizedError(error);
            });
        }).then(combineResult).then(function(response){
            if (response.status != 'error' && response.result)
                return _.extend(response, data);
            return Promise.reject(response);
        });
    },

    screen: function(data) {
        validate(data.securityClass, 'data.securityClass', isSecurityClass);
        validate(data.criteria, 'data.criteria', isArrayOf(isCriteria));
        validate(data.begin, 'data.begin', isISOString);
        validate(data.begin, 'data.end', isISOString);
        var incomplete = chrome.runtime.getManifest().permissions.indexOf('notifications') >= 0;
        return promiseSecurities(services, data.securityClass, function(security, i, securities) {
            return promiseSignals(services, incomplete && securities.length < 100, {
                cmd: 'signals',
                begin: data.begin,
                end: data.end,
                criteria: data.criteria,
                security: security,
                correlated: data.securityClass.correlated
            }, data.load, true).catch(function(error){
                console.log("Could not load", security.ticker, error.status, error);
                return normalizedError(error);
            });
        }).then(combineResult).then(function(response){
            if (response.status != 'error' && response.result)
                return _.extend(response, data);
            else return Promise.reject(response);
        });
    }
});

function promiseSignals(services, incomplete, data, load, strip) {
    var security = data.security;
    return retryAfterImport(services, incomplete, data, load).then(function(data){
        if (!data.result) return data;
        var result = strip ? _.omit(data.result, 'holding') : data.result;
        return _.extend(data, {
            result: _.extend(result, {
                security: security.iri
            })
        });
    }).then(function(first){
        if (_.isEmpty(first.result)) return combineResult([first]);
        else if (_.isEmpty(first.result.stop)) return combineResult([first]);
        else if (data.end < first.result.stop.until) return combineResult([first]);
        else return promiseSignals(services, incomplete, _.defaults({
            begin: first.result.stop.until
        }, data), load, strip).then(function(rest){
            return combineResult([first, rest]);
        });
    });
}

function promiseSecurities(services, securityClass, iteratee) {
    var exchange = securityClass.exchange;
    return listSecurities(services, securityClass).then(function(securities) {
        return Promise.all(securities.map(iteratee));
    });
}

function listSecurities(services, securityClass) {
    return Promise.resolve(securityClass).then(function(securityClass){
        if (!securityClass.sectors)
            return [];
        return Promise.all(securityClass.sectors.map(function(sector){
            return serviceMessage(services, 'list', {
                cmd: 'security-list',
                exchange: securityClass.exchange,
                sector: sector,
                industries: securityClass.industries,
                countries: securityClass.countries,
                mincap: securityClass.mincap,
                maxcap: securityClass.maxcap
            }).then(_.property('result'));
        }));
    }).then(_.flatten).then(function(result){
        return _.difference(result, securityClass.excludes || []);
    }).then(_.flatten).then(function(result){
        var exchange = securityClass.exchange;
        return result.map(function(security){
            return {
                ticker: decodeURI(security.substring(exchange.iri.length + 1)),
                iri: security,
                exchange: exchange
            };
        });
    }).then(function(result){
        return result.concat(securityClass.includes || []);
    });
}

function retryAfterImport(services, incomplete, data, load) {
    var failfast = load !== false;
    var primary = services.mentat[getWorker(services.mentat, data.security.iri + failfast)];
    var port = services.mentat[getWorker(services.mentat, data.security.iri)];
    return refresh(services, incomplete, data, primary, port).then(function(){
        return primary.promiseMessage(_.extend({
            failfast: failfast
        }, data));
    }).catch(function(error){
        if (load === false && error.quote && error.status == 'warning')
            return error; // just use what we have
        if (_.isEmpty(error.quote) || load === false)
            return Promise.reject(error);
        // try to load more
        return importAndRun(services, incomplete, data, port, error.quote);
    });
}

function refresh(services, incomplete, data, primary, port) {
    var intervals = data.interval ? _.object([data.interval.value],[data.interval]) : data.criteria.reduce(function(intervals, criteria){
        return _.compact([
            criteria.indicator, criteria.difference, criteria.percent,
            criteria.indicatorWatch, criteria.differenceWatch, criteria.percentWatch
        ]).reduce(function(intervals, indicator){
            intervals[indicator.interval.value] = indicator.interval;
            return intervals;
        }, intervals);
    }, {});
    return primary.promiseMessage({
        cmd: 'refresh',
        security: data.security,
        intervals: _.values(intervals),
        upper: data.end,
        includeIncomplete: incomplete
    }).then(function(data){
        if (_.isEmpty(data.result)) return;
        else return importQuotes(services, incomplete, data.security, data.result, port);
    });
}

function importAndRun(services, incomplete, data, port, quotes) {
    return importQuotes(services, incomplete, data.security, quotes, port).then(function(imported){
        return port.promiseMessage(data).catch(function(error){
            var minStart = _.compose(_.property('start'), _.first, _.partial(_.sortBy, _, 'start'));
            var earliest = _.mapObject(_.groupBy(quotes, 'interval'), minStart);
            var intervals = !_.isEmpty(error.quote) && _.mapObject(_.groupBy(error.quote, 'interval'), minStart);
            // TODO try again if requesting different security
            if (intervals && _.some(intervals, function(start, interval){
                return !earliest[interval] || start < earliest[interval];
            })) {
                // asking for different invervals or start dates this time
                return importAndRun(services, incomplete, data, port, error.quote);
            } else if (error.status == 'warning') {
                // just use what we have
                return Promise.resolve(error);
            } else {
                return Promise.reject(error);
            }
        });
    });
}

function importQuotes(services, incomplete, security, quotes, port) {
    return Promise.all(quotes.map(function(request){
        return Promise.all(_.map(services.quote, function(quote, quoteName){
            return quote.promiseMessage(_.extend({
                cmd: 'quote'
            }, request)).then(function(data){
                return data.result;
            }).then(function(result){
                if (result.length === 0) return null;
                if (result[0].close !== undefined && isNaN(result[0].close))
                    throw Error("Data is NaN " + JSON.stringify(result[0]));
                if (!incomplete && _.first(result).incomplete) {
                    result.shift();
                } else if (!incomplete && _.last(result).incomplete) {
                    result.pop();
                }
                return port.promiseMessage(_.defaults({
                    cmd: 'import',
                    quoting: request,
                    points: result
                }, request));
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

var throttledLog = _.throttle(console.log.bind(console), 1000);
function getWorker(workers, string) {
    var keys = _.keys(workers);
    var mod = keys.length;
    if (!mod) throw Error("No workers");
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

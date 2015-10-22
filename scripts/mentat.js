// mentat.js
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

importScripts('../assets/moment-with-locales.js');
var window = { moment: moment };
importScripts('../assets/moment-timezone-with-data-2010-2020.js');
importScripts('../assets/underscore.js');

importScripts('intervals.js');
importScripts('calculations.js'); // parseCalculation
importScripts('utils.js');

var open = _.partial(openSymbolDatabase, indexedDB, _.map(intervals, 'storeName'));
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

    fields: function(data) {
        var calcs = asCalculation(parseCalculation.bind(this,data.exchange),data.expressions,data.interval);
        var errorMessage = _.first(_.compact(_.invoke(calcs, 'getErrorMessage')));
        if (!errorMessage) {
            return _.uniq(_.flatten(_.invoke(calcs, 'getFields')));
        } else {
            data.expressions.forEach(function(expression){
                var calc = parseCalculation(data.exchange, expression, data.interval);
                var msg = calc.getErrorMessage();
                if (msg)
                    throw new Error(msg + ' in ' + expression);
            });
        }
    },
    validate: function(data) {
        return validateExpressions(parseCalculation.bind(this, data.exchange), intervals, data);
    },
    increment: function(data) {
        if (!intervals[data.interval.value]) throw Error("Unknown interval: " + data.interval.value);
        return data.exchanges.reduce(function(memo, exchange){
            var period = createPeriod(intervals, exchange, data.interval.value);
            var next = period.inc(data.asof, data.increment || 1);
            if (memo && ltDate(memo, next)) return memo;
            return next;
        }, null);
    },

    'import': function(data) {
        var period = createPeriod(intervals, data.security.exchange, data.interval);
        if (!period) throw Error("Unknown interval: " + data.interval);
        return importData(open, period, data.security, data.points);
    },
    reset: function(data) {
        return Promise.all(intervals.map(function(interval){
            return open(data.security, interval, "readwrite", function(store, resolve, reject) {
                return resolve(store.clear());
            });
        })).then(function(){
            return {
                status: 'success'
            };
        });
    },
    load: function(data) {
        var period = createPeriod(intervals, data.security.exchange, data.interval.value);
        if (!period) throw Error("Unknown interval: " + data.interval.value);
        return loadData(parseCalculation.bind(this, data.security.exchange), open, data.failfast, data.security,
            data.length, data.lower, data.upper, period, data.expressions
        );
    },
    signals: function(data){
        var periods = screenPeriods(intervals, data.security.exchange, data.criteria);
        var load = pointLoad(parseCalculation, open, data.failfast, periods, data);
        return findAllSignals(periods, load, data.security, data.criteria, data.begin, data.end);
    },
    screen: function(data){
        var periods = screenPeriods(intervals, data.security.exchange, data.criteria);
        var load = pointLoad(parseCalculation, open, data.failfast, periods, data);
        var annual = createPeriod(intervals, data.security.exchange, 'annual');
        var minute = _.last(_.sortBy(_.values(periods), function(period) {
            return period.millis * -1;
        }));
        return findPositionSignals(periods, load, data.security, data.criteria, data.begin, data.end).then(function(data){
            if (_.isEmpty(data.result)) return data;
            var watch;
            var duration = minute.diff(data.end, data.begin);
            var firstYear = annual.floor(data.begin);
            var lastYear = annual.ceil(data.end);
            var yearLength = minute.diff(lastYear,firstYear) / annual.diff(lastYear,firstYear);
            var exposure = data.result.reduce(function(exposure, signal, i, signals){
                if (signal.signal == 'watch') {
                    watch = signal;
                }
                if (signal.signal == 'stop' || i == signals.length-1) {
                    return exposure + minute.diff(signal.asof, watch.asof);
                } else return exposure;
            }, 0);
            var performance = data.result.reduce(function(performance, signal, i, signals){
                if (signal.signal == 'watch') {
                    watch = signal;
                }
                if (signal.signal == 'stop' || i == signals.length-1) {
                    performance.push(100 * (signal.price - watch.price) / watch.price);
                }
                return performance;
            }, []);
            var drawup = data.result.reduce(function(drawup, item){
                if (item.signal == 'watch') {
                    watch = item;
                }
                var high = Math.max.apply(Math, _.compact(_.values(_.pick(item,_.keys(intervals))).map(function(point){
                    return point.high;
                }).concat(item.price)));
                return Math.max((high - watch.price) / watch.price * 100, drawup);
            }, 0);
            var drawdown = data.result.reduce(function(drawdown, item){
                if (item.signal == 'watch') {
                    watch = item;
                }
                var low = Math.min.apply(Math, _.compact(_.values(_.pick(item,_.keys(intervals))).map(function(point){
                    return point.low;
                }).concat(item.price)));
                return Math.min((low - watch.price) / watch.price * 100, drawdown);
            }, 0);
            var growth = performance.reduce(function(profit, ret){
                return profit + profit * ret / 100;
            }, 1) * 100 - 100;
            var exposed_growth = Math.pow(performance.reduce(function(profit, ret){
                return profit + profit * ret / 100;
            }, 1), yearLength / exposure) * 100 - 100;
            return _.extend(data, {
                result: _.extend({
                    watch: _.last(data.result.filter(function(item){
                        return item.signal == 'watch';
                    })),
                    positive_excursion: drawup,
                    negative_excursion: drawdown,
                    performance: performance,
                    growth: growth,
                    exposure: (exposure / duration) * 100,
                    duration: duration / yearLength,
                    exposed_growth: exposed_growth
                }, _.last(data.result))
            });
        });
    }
});

function sum(numbers) {
    return numbers.reduce(function(sum, num){
        return sum + num;
    }, 0);
}

function pointLoad(parseCalculation, open, failfast, periods, data) {
    var bar = loadBar.bind(this, parseCalculation, open, failfast, data.end);
    var securityFilters = data.criteria.filter(_.negate(_.property('againstCorrelated')));
    var correlatedFilters = data.criteria.filter(_.property('againstCorrelated'));
    var loadSecurity = pointLoadSecurity(bar, periods, data.security, securityFilters);
    if (!data.correlated || _.isEmpty(correlatedFilters)) return loadSecurity;
    var loadCorrelated = pointLoadSecurity(bar, periods, data.correlated, correlatedFilters);
    return function(afterPeriod, after, asof, until) {
        return loadSecurity(afterPeriod, after, asof, until).then(function(data){
            return loadCorrelated(afterPeriod, after, asof, until).then(function(correlated){
                return _.extend(combineResult([data, correlated]), {
                    result: _.extend(data.result, {
                        correlated: correlated.result
                    })
                });
            });
        });
    };
}

function pointLoadSecurity(bar, periods, security, filters) {
    var exprs = _.compact(_.flatten(filters.map(function(criteria){
        return [
            criteria.indicator, criteria.difference, criteria.percent,
            criteria.indicatorWatch, criteria.differenceWatch, criteria.percentWatch
        ];
    }))).reduce(function(exprs, indicator){
        var expr = indicator.expression;
        var interval = indicator.interval.value;
        if (!exprs[interval]) exprs[interval] = [];
        if (exprs[interval].indexOf(expr) < 0) exprs[interval].push(expr);
        return exprs;
    }, {});
    var intervals = _.sortBy(_.keys(periods), function(interval){
        return -periods[interval].millis;
    });
    var epoc = new Date(0);
    var cache = {};
    return function(afterPeriod, after, asof, until) {
        return Promise.all(intervals.map(function(interval){
            var a = afterPeriod.millis >= periods[interval].millis ? after : epoc;
            return bar(cache, security, periods[interval], a, exprs[interval], asof, until);
        })).then(function(bars){
            return _.extend(combineResult(bars), {
                result: bars.reduce(function(result, bar, i) {
                    if (!bar.result) return result;
                    return _.extend(result, _.object([
                        intervals[i], 'price', 'asof', 'until'
                    ], [
                        bar.result, bar.result.close, bar.result.asof, bar.result.until
                    ]));
                }, {})
            });
        });
    };
}

function loadBar(parseCalculation, open, failfast, upper, cache, security, period, after, expressions, asof, until) {
    var next = period.inc(asof, 1);
    if (!cache[period.value] ||
            ltDate(cache[period.value].upper, next) ||
            ltDate(asof, cache[period.value].lower)) {
        var begin = asof;
        var end = minDate(period.inc(asof, 100), period.inc(upper, 1));
        cache[period.value] = {
            lower: begin,
            upper: end,
            promise: loadData(parseCalculation.bind(this, security.exchange), open, failfast, security,
                2, begin, end, period, expressions)
        };
    }
    return cache[period.value].promise.then(function(data){
        if (_.isEmpty(data.result)) return _.extend({}, data, {
            result: undefined
        });
        var idx = _.sortedIndex(data.result, {
            asof: toISOString(asof)
        }, 'asof');
        if (idx >= data.result.length || idx && ltDate(asof, data.result[idx].asof)) {
            idx--;
        }
        if (idx+1 < data.result.length && ltDate(data.result[idx].asof, after)) {
            idx++;
        }
        if (ltDate(until, data.result[idx].asof)) return _.extend({}, data, {
            result: undefined
        });
        else if (idx+1 < data.result.length) return _.extend({}, data, {
            result: _.extend(data.result[idx], {
                since: idx ? data.result[idx-1].asof : data.result[idx].since,
                until: data.result[idx+1].asof
            })
        });
        else return _.extend({}, data, {
            result: _.extend(data.result[idx], {
                since: idx ? data.result[idx-1].asof : data.result[idx].since,
                until: maxDate(period.inc(data.result[idx].asof, 1), period.ceil(asof))
            })
        });
    });
}

function screenPeriods(intervals, exchange, filters) {
    return _.indexBy(filters.reduce(function(intervals, criteria){
        return _.union(intervals, _.compact([
            criteria.indicator, criteria.difference, criteria.percent,
            criteria.indicatorWatch, criteria.differenceWatch, criteria.percentWatch
        ]).map(_.compose(_.property('value'), _.property('interval'))));
    }, []).map(createPeriod.bind(this, intervals, exchange)), 'value');
}

function findAllSignals(periods, load, security, criteria, begin, end) {
    var watch = findWatchSignal.bind(this, periods, load, criteria);
    var stop = findStopSignal.bind(this, periods, load, criteria);
    var hold = function(watching, begin, end) {
        return findAllHoldSignals(periods, load, criteria, watching, watching.asof, end);
    };
    return screenSignals(security, watch, hold, stop, begin, end);
}

function findPositionSignals(periods, load, security, criteria, begin, end) {
    var watch = findWatchSignal.bind(this, periods, load, criteria);
    var stop = findStopSignal.bind(this, periods, load, criteria);
    var hold = findLastHoldSignals.bind(this, periods, load, criteria);
    return screenSignals(security, watch, hold, stop, begin, end);
}

function screenSignals(security, watch, hold, stop, begin, end) {
    return watch(begin, end).then(function(ws){
        if (!ws.result) return _.extend(ws, {
            result: []
        });
        return stop(ws.result, ws.result.asof, end).then(function(ss){
            var last = ss.result ? ss.result.asof : ws.result.asof;
            var stopped = ss.result ? ss.result.asof : end;
            return hold(ws.result, last, stopped).then(function(hs) {
                if (_.isEmpty(hs.result) && _.isEmpty(ss.result))
                    return combineResult([ws]);
                else if (!_.isArray(hs.result))
                    return combineResult([ws, deepExtend(hs,ss)]);
                deepExtend(_.last(hs.result), ss.result);
                deepExtend(_.first(hs.result), ws.result);
                return combineResult([hs]);
            });
        });
    }).then(function(first){
        var firstStop = _.last(first.result);
        if (!firstStop || firstStop.signal != 'stop' || ltDate(end, firstStop.until))
            return first;
        return screenSignals(security, watch, hold, stop, firstStop.until, end).then(function(rest){
            if (_.isEmpty(rest.result)) return first;
            return combineResult([first, rest]);
        });
    }).then(function(data){
        return _.extend(data, {
            result: data.result.map(function(datum){
                return _.extend(datum, {security: security.iri});
            }),
            begin: begin,
            end: end
        });
    });
}

function findWatchSignal(periods, load, filters, begin, end){
    return findSignal(periods, load, 'watch', filters, {}, begin, end).then(function(data){
        if (_.isEmpty(data.result)) return data;
        return _.extend(data, {
            result: addGainPain(filters, data.result, data.result)
        });
    });
}

function findStopSignal(periods, load, filters, watching, begin, end){
    return findSignal(periods, load, 'stop', filters, watching, begin, end);
}

function findAllHoldSignals(periods, load, filters, watching, begin, end) {
    return findSignal(periods, load, 'hold', filters, watching, begin, end).then(function(first) {
        if (!first.result) return _.extend(first, {
            result: []
        });
        if (ltDate(end, first.result.until)) return _.extend(first, {
            result: [first.result]
        });
        return findAllHoldSignals(periods, load, filters, watching, first.result.until, end).then(function(rest) {
            rest.result.unshift(first.result);
            return rest;
        });
    }).then(function(data){
        if (_.isEmpty(data.result)) return data;
        return _.extend(data, {
            result: data.result.map(addGainPain.bind(this, filters, watching))
        });
    });
}

function findLastHoldSignals(periods, load, filters, watching, begin, end) {
    return findSignal(periods, load, 'hold', filters, watching, begin, end).then(function(first) {
        if (!first.result || ltDate(end, first.result.until)) return first;
        return findLastHoldSignals(periods, load, filters, watching, first.result.until, end).then(function(last) {
            return deepExtend(first, last);
        });
    }).then(function(data){
        if (_.isEmpty(data.result)) return data;
        return _.extend(data, {
            result: addGainPain(filters, watching, data.result)
        });
    });
}

function deepExtend(target, source) {
    for (var prop in source) {
        var dst = target[prop];
        var src = source[prop];
        if (src && prop in target && typeof dst == 'object' && typeof src == 'object')
            deepExtend(dst, src);
        else if (src !== undefined) target[prop] = src;
    }
    return target;
}

function addGainPain(filters, watch, hold) {
    return addGain(filters, watch, addPain(filters, watch, hold));
}

function addPain(filters, watch, hold) {
    hold.pain = filters.reduce(function(avg, criteria){
        if (_.isFinite(criteria.painIntercept)) {
            var value = valueOfCriteria(criteria, watch, hold);
            if (_.isFinite(value)) {
                var intercept = +criteria.painIntercept;
                var slope = +(criteria.painSlope || 0);
                var weight = +(criteria.weight || 1);
                var perf = value * slope + intercept;
                avg.value = ((avg.value || 0) * avg.weight + perf * weight) / (avg.weight + weight);
                avg.weight += weight;
            }
        }
        return avg;
    }, {weight:0,value:undefined}).value;
    return hold;
}

function addGain(filters, watch, hold) {
    hold.gain = filters.reduce(function(avg, criteria){
        if (_.isFinite(criteria.gainIntercept)) {
            var value = valueOfCriteria(criteria, watch, hold);
            if (_.isFinite(value)) {
                var intercept = +criteria.gainIntercept;
                var slope = +(criteria.gainSlope || 0);
                var weight = +(criteria.weight || 1);
                var perf = value * slope + intercept;
                avg.value = ((avg.value || 0) * avg.weight + perf * weight) / (avg.weight + weight);
                avg.weight += weight;
            }
        }
        return avg;
    }, {weight:0,value:undefined}).value;
    return hold;
}

function findSignal(periods, load, signal, filters, watching, begin, end){
    if (ltDate(end, begin))
        throw Error("Assert error " + end + " is less than " + begin);
    if (!filters.length) return Promise.resolve({status: 'success'});
    var intervals = filters.reduce(function(intervals, criteria){
        return _.union(intervals, _.compact([
            criteria.indicator, criteria.difference, criteria.percent,
            criteria.indicatorWatch, criteria.differenceWatch, criteria.percentWatch
        ]).map(_.compose(_.property('value'), _.property('interval'))));
    }, []);
    var sorted = _.sortBy(intervals, function(interval) {
        if (!periods[interval]) throw Error("Unknown interval: " + interval);
        return periods[interval].millis * -1;
    });
    var byInterval = _.groupBy(filters, function(criteria) {
        var intervals = _.compact([
            criteria.indicator, criteria.difference, criteria.percent,
            criteria.indicatorWatch, criteria.differenceWatch, criteria.percentWatch
        ]).map(_.compose(_.property('value'), _.property('interval')));
        if (_.isEmpty(intervals)) throw Error("No indicator: " + JSON.stringify(criteria));
        return _.min(intervals, function(interval){
            return periods[interval].millis;
        });
    });
    return filterSecurityByPeriods(load, signal, watching, {}, sorted.map(function(interval) {
        return {
            period: periods[interval],
            filters: byInterval[interval] || []
        };
    }), new Date(0), begin, end).then(function(data){
        if ((!data.result || ltDate(data.result.asof, begin)) && ltDate(data.result.until, end) && ltDate(begin, data.result.until))
            return findSignal(periods, load, signal, filters, watching, data.result.until, end);
        if (!data.result || ltDate(data.result.asof, begin))
            return _.extend(data, {
                passed: undefined,
                result: undefined
            });
        else if (signal == 'watch' && !data.passed ||
                signal == 'stop' && data.passed != false)
            return _.extend(data, {
                result: undefined
            });
        else return _.extend(data, {
            result: _.extend(data.result, {
                signal: signal
            })
        });
    });
}

function filterSecurityByPeriods(load, signal, watching, holding, periodsAndFilters, after, begin, upper) {
    if (ltDate(upper, begin))
        throw Error("Assert error " + upper + " is less than " + begin);
    var rest = _.rest(periodsAndFilters);
    var period = _.first(periodsAndFilters).period;
    var filters = _.first(periodsAndFilters).filters;
    return findNextSignal(load, signal, !rest.length, period, filters, watching, holding, after, begin, upper).then(function(data){
        if (!data.result || !data.result[period.value]) return data;
        if (data.passed === false || !rest.length) return data;
        var asof = data.result[period.value].asof;
        var start = period.ceil(asof);
        if (ltDate(upper, start)) {
            // couldn't find signal, end of period
            return _.extend({}, data, {
                passed: undefined
            });
        }
        var through = data.result[period.value].until;
        return filterSecurityByPeriods(load, signal, watching, data.result, rest, asof, maxDate(start, begin), minDate(upper, through)).then(function(child){
            if (ltDate(upper, through) || ltDate(through, begin, true) ||
                    signal == 'watch' && child.passed ||
                    signal == 'stop' && child.passed == false ||
                    signal == 'hold') return _.extend({}, child, {
                status: child.status == "success" ? data.status : child.status,
                quote: _.compact(_.flatten([data.quote, child.quote])),
                result: child.result
            });
            // couldn't find a signal, try next period
            return filterSecurityByPeriods(load, signal, watching, holding, periodsAndFilters, after, through, upper);
        });
    });
}

function findNextSignal(load, signal, leaf, period, filters, watching, holding, after, begin, until) {
    if (signal == 'watch')
        return findNextActiveFilter(true, load, period, filters, watching, holding, after, begin, until);
    else if (signal == 'stop' && leaf)
        return findNextActiveFilter(false, load, period, filters, watching, holding, after, begin, until);
    else if (signal == 'stop')
        return loadFilteredPoint(load, period, filters, watching, holding, after, begin, until);
    else if (signal == 'hold')
        return load(period, after, minDate(begin,until));
    else throw Error("Unknown signal: " + signal);
}

function findNextActiveFilter(pass, load, period, filters, watching, holding, after, begin, until) {
    if (ltDate(until, begin))
        throw Error("Assert error " + until + " is less than " + begin);
    return loadFilteredPoint(load, period, filters, watching, holding, after, begin, until).then(function(data){
        if (!data.result || !data.result[period.value])
            return data;
        var through = data.result[period.value].until;
        if (ltDate(through, begin, true))
            return data;
        if (pass != data.passed && ltDate(through, until, true))
            return findNextActiveFilter(pass, load, period, filters, watching, holding, after, through, until);
        else return data;
    });
}

function loadFilteredPoint(load, period, filters, watching, holding, after, begin, until) {
    return load(period, after, minDate(begin,until), until).then(function(data){
        if (!data.result || !data.result[period.value]) return data;
        var pass =_.reduce(filters, function(pass, criteria) {
            if (!pass) return false;
            var hold = data.result;
            var watch = _.isEmpty(watching) ? hold : watching; // is 'watch' signal?
            var value = valueOfCriteria(criteria, watch, hold);
            if (_.isFinite(criteria.lower)) {
                if (value < +criteria.lower)
                    return false;
            }
            if (_.isFinite(criteria.upper)) {
                if (+criteria.upper < value)
                    return false;
            }
            return pass;
        }, true);
        return _.extend(data, {
            passed: pass
        });
    });
}

function valueOfCriteria(crt, watch, hold) {
    var w = crt.againstCorrelated && watch.correlated ? watch.correlated : watch;
    var h = crt.againstCorrelated && hold.correlated ? hold.correlated : hold;
    var primary = crt.indicator ?
        valueOfIndicator(crt.indicator, h) :
        valueOfIndicator(crt.indicatorWatch, w);
    var diff = valueOfIndicator(crt.difference, h) || valueOfIndicator(crt.differenceWatch, w) || 0;
    var of = valueOfIndicator(crt.percent, h) || valueOfIndicator(crt.percentWatch, w);
    if (!_.isFinite(primary)) return undefined;
    else if (!of) return primary - diff;
    else return (primary - diff) * 100 / Math.abs(of);
}

function valueOfIndicator(indicator, reference) {
    var int = indicator && indicator.interval.value;
    if (int && reference[int]) return reference[int][indicator.expression];
    else return undefined;
}

function loadData(parseCalculation, open, failfast, security, length, lower, upper, period, expressions) {
    var calcs = asCalculation(parseCalculation, expressions, period);
    var n = _.isEmpty(expressions) ? 0 : _.max(_.invoke(calcs, 'getDataLength'));
    var errorMessage = _.first(_.compact(_.invoke(calcs, 'getErrorMessage')));
    if (errorMessage) throw Error(errorMessage);
    return collectIntervalRange(open, failfast, security, period, length + n - 1, lower, upper).then(function(data) {
        var updates = [];
        var startIndex = Math.max(lengthBelow(data.result, lower) - length, 0);
        var endIndex = Math.max(startIndex + length, lengthBelow(data.result, upper));
        var ar = startIndex || endIndex < data.result.length ? data.result.slice(startIndex, endIndex) : data.result;
        var result = _.map(ar, function(result, i) {
            var updated = false;
            var point = _.reduce(calcs, function(point, calc, c){
                if (_.isUndefined(point[expressions[c]])) {
                    var points = preceding(data.result, calc.getDataLength(), startIndex + i);
                    var value = calc.getValue(points);
                    if (_.isNumber(value)) {
                        point[expressions[c]] = value;
                        updated = true;
                    }
                }
                return point;
            }, result);
            if (updated && data.status == "success") {
                updates.push(point);
                if (updates.length >= 100) {
                    storeData(open, security, period, updates.splice(0, updates.length));
                }
            }
            return point;
        });
        if (updates.length) {
            return storeData(open, security, period, updates).then(_.constant(_.extend(data, {
                result: result
            })));
        }
        return _.extend(data, {
            result: result
        });
    });
}

function collectIntervalRange(open, failfast, security, period, length, lower, upper) {
    if (!period.derivedFrom)
        return collectRawRange(open, failfast, security, period, length, lower, upper);
    return open(security, period, 'readonly', collect.bind(this, length, lower, upper)).then(function(result){
        var next = result.length ? period.inc(result[result.length - 1].asof, 1) : null;
        var below = lengthBelow(result, lower);
        if (below >= length && next && (ltDate(upper, next) || ltDate(Date.now(), next))) {
            // result complete
            return {
                status: 'success',
                result: result
            };
        } else if (result.length && below >= length) {
            // need to update with newer data
            var last = result[result.length - 1];
            return collectAggregateRange(open, failfast, security, period, 1, last.asof, upper).then(function(aggregated){
                return storeNewData(open, security, period, aggregated.result).then(function(){
                    return open(security, period, 'readonly', collect.bind(this, length, lower, upper));
                }).then(function(result){
                    return _.extend(aggregated, {
                        result: result
                    });
                });
            });
        } else {
            // no data available
            return bounds(open, security, period).then(function(bounds){
                var start = bounds && ltDate(_.last(bounds), lower) ? _.last(bounds) : lower;
                var end = bounds && ltDate(upper, _.first(bounds)) ? _.first(bounds) : upper;
                var floored = period.floor(start);
                return collectAggregateRange(open, failfast, security, period, length, floored, end);
            }).then(function(aggregated){
                if (aggregated.status == "warning" && aggregated.result.length == result.length)
                    return _.extend(aggregated, {
                        result: result
                    });
                return storeNewData(open, security, period, aggregated.result).then(function(){
                    var first = _.first(aggregated.result).asof;
                    var last = _.last(aggregated.result).asof;
                    return open(security, period, 'readonly', collect.bind(this, 1, first, last));
                }).then(function(result){
                    // return the merged result
                    return _.extend(aggregated, {
                        result: result
                    });
                });
            });
        }
    });
}

function collectAggregateRange(open, failfast, security, period, length, lower, upper) {
    var ceil = period.ceil;
    var end = period.inc(upper, 2); // increment beyond a complete point
    var size = period.aggregate * (length + 1);
    return collectRawRange(open, failfast, security, period.derivedFrom, size, lower, end).then(function(data){
        if (!data.result.length) return data;
        var upper, count, discard = ceil(data.result[0].asof);
        var result = data.result.reduce(function(result, point){
            if (ltDate(point.asof, discard, true)) return result;
            var preceding = result[result.length-1];
            if (!preceding || ltDate(upper, point.asof)) {
                result.push(point);
                upper = ceil(point.asof);
                count = 0;
            } else {
                result[result.length-1] = {
                    asof: point.asof,
                    open: preceding.open,
                    close: point.close,
                    total_volume: point.total_volume,
                    high: Math.max(preceding.high, point.high),
                    low: Math.min(preceding.low, point.low),
                    volume: period.value.charAt(0) == 'd' ?
                        Math.round((preceding.volume * count + point.volume) / (++count)) :
                        (preceding.volume + point.volume)
                };
            }
            return result;
        }, []);
        if (result.length && ltDate(_.last(result).asof, upper)) {
            result.pop(); // last period is beyond upper
        } else if (result.length && ltDate(_.last(result).asof, period.ceil(_.last(result).asof))) {
            result.pop(); // last period is not yet complete
        }
        return _.extend(data, {
            result: result
        });
    });
}

function collectRawRange(open, failfast, security, period, length, lower, upper) {
    return open(security, period, 'readonly', collect.bind(this, length, lower, upper)).then(function(result){
        var conclude = failfast ? Promise.reject.bind(Promise) : Promise.resolve.bind(Promise);
        var next = result.length ? period.inc(result[result.length - 1].asof, 1) : null;
        var below = lengthBelow(result, lower);
        if (below >= length && next && (ltDate(upper, next) || ltDate(new Date(), next))) {
            // result complete
            return {
                status: 'success',
                result: result
            };
        } else if (result.length && below >= length) {
            return open(security, period, 'readonly', nextItem.bind(this, upper)).then(function(newer){
                if (newer) return { // result complete
                    status: 'success',
                    result: result
                };
                // need to update with newer data
                return conclude({
                    status: failfast ? 'error' : 'warning',
                    message: 'Need newer data points',
                    result: result,
                    quote: [{
                        security: security,
                        interval: period.value,
                        start: period.format(period.dec(_.last(result).asof, 2))
                    }]
                });
            });
        } else if (result.length && below < length) {
            var earliest = ltDate(lower, result[0].asof) ? lower : result[0].asof;
            // need more historic data
            var quote = [{
                security: security,
                interval: period.value,
                start: period.format(period.dec(earliest, 2 * (length - below))),
                end: period.format(result[0].asof)
            }];
            if (ltDate(next, upper)) {
                quote.push({
                    security: security,
                    interval: period.value,
                    start: period.format(period.dec(_.last(result).asof, 2))
                });
            }
            return Promise.reject({
                status: 'error',
                message: 'Need more data points',
                quote: quote
            });
        } else {
            // no data available
            return bounds(open, security, period).then(function(bounds){
                var d1 = period.dec(lower, length);
                var earliest = _.first(bounds);
                var latest = _.last(bounds);
                var start = latest && ltDate(latest, d1) ? period.dec(latest, 2) : d1;
                var end = earliest && ltDate(upper, earliest) ? period.inc(earliest, 2) : undefined;
                return Promise.reject({
                    status: 'error',
                    message: 'No data points available',
                    quote: [{
                        security: security,
                        interval: period.value,
                        start: period.format(start),
                        end: end ? period.format(end) : undefined
                    }]
                });
            });
        }
    });
}

function importData(open, period, security, result) {
    var now = Date.now();
    var points = result.map(function(point){
        var obj = {};
        var tz = point.tz || period.tz;
        if (point.dateTime) {
            obj.asof = moment.tz(point.dateTime, tz).toISOString();
        } else if (point.date) {
            var time = point.date + ' ' + period.marketClosesAt;
            obj.asof = moment.tz(time, tz).toISOString();
        }
        for (var prop in point) {
            if (_.isNumber(point[prop]))
                obj[prop] = point[prop];
        }
        return obj;
    }).filter(function(point){
        // Yahoo provides weekly/month-to-date data
        return ltDate(point.asof, now, true);
    });
    return storeNewData(open, security, period, points).then(function(){
        return {
            status: 'success'
        };
    });
}

function storeNewData(open, security, period, data) {
    if (!data.length) return Promise.resolve(data);
    return bounds(open, security, period).then(function(bounds){
        if (!bounds) return data;
        else if ((_.last(bounds) < _.first(data).asof && _.last(bounds) < _.last(data).asof)
                || (_.first(data).asof < _.first(bounds) && _.last(data).asof < _.first(bounds)))
            throw Error('Disconnected import: '
                + _.first(data).asof + ' - ' + _.last(data).asof + ' is disconnected from '
                +_.first(bounds) + ' - ' + _.last(bounds) + ' in ' + period.value);
        else return data.filter(function(point){
            return point.asof < _.first(bounds) || point.asof > _.last(bounds);
        });
    }).then(storeData.bind(this, open, security, period));
}

function storeData(open, security, period, data) {
    if (!data.length) return Promise.resolve(data);
    console.log("Storing", data.length, period.value, security, data[data.length-1]);
    return open(security, period, "readwrite", function(store, resolve, reject){
        var counter = 0;
        var onsuccess = function(){
            if (++counter >= data.length) {
                resolve(data);
            }
        };
        data.forEach(function(datum,i){
            if (typeof datum.asof != 'string') {
                reject(Error("asof is not an ISOString: " + datum.asof));
            }
            var op = store.put(datum);
            op.onerror = reject;
            op.onsuccess = onsuccess;
        });
    });
}

function bounds(open, security, period) {
    return open(security, period, 'readonly', nextItem.bind(this, null)).then(function(earliest){
        if (!earliest) return undefined;
        var now = new Date().toISOString();
        return open(security, period, 'readonly', collect.bind(this, 1, now, now)).then(function(latest){
            return _.last(latest);
        }).then(function(latest){
            return [earliest.asof, latest.asof];
        });
    });
}

function openSymbolDatabase(indexedDB, storeNames, security, period, mode, callback) {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open(security.iri, 10);
        request.onerror = reject;
        request.onupgradeneeded = function(event) {
            try {
                var db = event.target.result;
                // Clear the database to re-download everything
                for (var i=db.objectStoreNames.length -1; i>=0; i--) {
                    var name = db.objectStoreNames[i];
                    if (name != "annual" && name != "quarter") {
                        // annual and quarter history is limited
                        db.deleteObjectStore(db.objectStoreNames[i]);
                    }
                }
                // Create an objectStore for this database
                storeNames.forEach(function(name){
                    if (!db.objectStoreNames.contains(name)
                            || (name != "annual" && name != "quarter")) {
                        db.createObjectStore(name, { keyPath: "asof" });
                    }
                });
            } catch(e) {
                reject(e);
            }
        };
        request.onsuccess = function(event) {
            try {
                var db = event.target.result;
                var trans = db.transaction(period.storeName, mode);
                return callback(trans.objectStore(period.storeName), resolve, reject);
            } catch(e) {
                reject(e);
            }
        };
    });
}

function collect(below, lower, upper, store, resolve, reject) {
    var results = [];
    var between = 0;
    var cursor = store.openCursor(IDBKeyRange.upperBound(toISOString(upper)), "prev");
    cursor.onerror = reject;
    cursor.onsuccess = function(event) {
        try {
            var cursor = event.target.result;
            if (cursor) {
                if (ltDate(lower, cursor.value.asof)) {
                    between = results.length + 1;
                }
                if (results.length < below + between) {
                    results.push(cursor.value);
                    cursor.continue();
                    return;
                }
            }
            resolve(results.reverse());
        } catch (e) {
            reject(e);
        }
    };
}

function lengthBelow(result, lower) {
    var below = _.sortedIndex(result, {
        asof: toISOString(lower)
    }, 'asof');
    return below < result.length && ltDate(result[below].asof, lower, true) ? below +1 : below;
}

function toISOString(date) {
    if (typeof date == 'string') return date;
    else return moment(date).toISOString();
}

function minDate(d1, d2) {
    return d1 && ltDate(d1, d2) || !d2 ? d1 : d2;
}

function maxDate(d1, d2) {
    return d1 && ltDate(d2, d1) || !d2 ? d1 : d2;
}

function ltDate(d1, d2, orEq) {
    if (typeof d1 == 'string' && typeof d2 == 'string') {
        return orEq && d1 <= d2 || d1 < d2;
    } else {
        return ltDate(toISOString(d1), toISOString(d2), orEq);
    }
}

function nextItem(lower, store, resolve, reject) {
    var cursor = lower ? store.openCursor(IDBKeyRange.lowerBound(toISOString(lower)), "next") : store.openCursor();
    cursor.onerror = reject;
    cursor.onsuccess = function(event) {
        try {
            var cursor = event.target.result;
            if (cursor) {
                resolve(cursor.value);
            } else {
                resolve(null);
            }
        } catch (e) {
            reject(e);
        }
    };
}

function findIndex(array, predicate) {
    for (var i=0; i < array.length; i++) {
        if (predicate(array[i])) {
            return i;
        }
    }
    return undefined;
}

function preceding(array, len, endIndex) {
    var list = [];
    var startIndex = Math.max(0, endIndex - len + 1);
    for (var i=startIndex; i < array.length && i <= endIndex; i++) {
        list.push(array[i]);
    }
    return list;
}

function validateExpressions(parseCalculation, intervals, data) {
    var calc = parseCalculation(data.expression, data.interval);
    var errorMessage = calc.getErrorMessage();
    if (errorMessage) {
        throw new Error(errorMessage);
    } else if (!data.interval || intervals[data.interval.value]) {
        return {
            status: 'success'
        };
    } else {
        throw new Error("Invalid interval: " + data.interval.value);
    }
}

function asCalculation(parseCalculation, expressions, interval) {
    return _.map(expressions, function(expr){
        return parseCalculation(expr, interval);
    });
}

function createPeriod(intervals, exchange, interval) {
    if (!exchange || !exchange.tz) throw Error("Missing exchange");
    var period = intervals[interval];
    var self = {};
    return period && _.extend(self, period, {
        value: period.value,
        millis: period.millis,
        tz: exchange.tz,
        marketClosesAt: exchange.marketClosesAt,
        derivedFrom: period.derivedFrom && createPeriod(intervals, exchange, period.derivedFrom.value),
        floor: function(date) {
            return period.floor(exchange, date).toISOString();
        },
        ceil: function(date) {
            return period.ceil(exchange, date).toISOString();
        },
        inc: function(date, n) {
            return period.inc(exchange, date, n).toISOString();
        },
        dec: function(date, n) {
            return period.dec(exchange, date, n).toISOString();
        },
        diff: function(to, from) {
            return period.diff(exchange, to, from);
        },
        format: function(date) {
            return moment.tz(date, exchange.tz).format();
        }
    });
}

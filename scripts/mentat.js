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

var open = _.partial(openSymbolDatabase, indexedDB, _.map(intervals, 'value'));
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
            return open(data.security, interval.value, "readwrite", function(store, resolve, reject) {
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
    refresh: function(data){
        var ex = data.security.exchange;
        var periods = _.sortBy(data.intervals.map(function(interval){
            var derivedFrom = intervals[interval.value].derivedFrom;
            var value = derivedFrom ? derivedFrom.value : interval.value;
            return createPeriod(intervals, ex, value);
        }), 'millis');
        var next = _.first(periods).ceil(data.upper);
        return Promise.all(periods.map(function(period){
            var collect3 = collect.bind(this, 3, null, null);
            return open(data.security, period.value, "readonly", collect3).then(function(last3){
                if (_.isEmpty(last3)) return {
                    security: data.security,
                    interval: period.value,
                    start: period.format(period.dec(data.upper, 1000))
                };
                var lastComplete = _.last(_.reject(last3, 'incomplete'));
                var outdated = ltDate(period.inc(lastComplete.asof, 1), data.upper, true);
                var soon = data.includeIncomplete && ltDate(period.ceil(data.upper), next, true);
                var lastTrade = _.last(last3).lastTrade || _.last(last3).asof;
                var afterLast = ltDate(lastTrade, data.upper);
                if (outdated || soon && afterLast && isMarketOpen(ex, data.upper)) return {
                    security: data.security,
                    interval: period.value,
                    start: period.format(_.first(last3).asof)
                };
            });
        })).then(_.compact).then(function(results){
            return {
                status: 'success',
                result: results
            };
        });
    },
    signals: function(data){
        var security = data.security;
        var periods = screenPeriods(intervals, security.exchange, data.criteria);
        var load = pointLoad(parseCalculation, open, data.failfast, periods, data);
        var minute = _.min(_.values(periods), 'millis');
        var end = minute.inc(data.end, 1);
        return findSignals(periods, load, security, data.criteria, data.begin, end)
        .then(summarizeSignals.bind(this, periods, security.exchange, data.begin, end));
    }
});

function isMarketOpen(ex, asof) {
    var now = moment(asof);
    var closesAt = now.tz(ex.tz).format('YYYY-MM-DD') + 'T' + ex.afterHoursClosesAt;
    var closes = moment.tz(closesAt, ex.tz);
    if (now.isAfter(closes)) {
        closes.add(1, 'days');
    }
    var opensAt = closes.format('YYYY-MM-DD') + 'T' + ex.premarketOpensAt;
    var opens = moment.tz(opensAt, ex.tz);
    return opens.isSame(closes) || opens.isBefore(now);
}

function summarizeSignals(periods, exchange, begin, end, data) {
    if (_.isEmpty(data.result)) return data;
    var annual = createPeriod(intervals, exchange, 'annual');
    var minute = _.min(_.values(periods), 'millis');
    var firstYear = annual.floor(begin);
    var lastYear = annual.ceil(end);
    var yearLength = minute.diff(lastYear,firstYear) / annual.diff(lastYear,firstYear);
    var watch = data.result.watch;
    var stop = data.result.stop || _.last(data.result.holding) || watch;
    var exposure = minute.diff(stop.asof, watch.asof) / yearLength *100;
    var performance = 100 * (stop.price - watch.price) / watch.price;
    var positive_excursion = runup(minute.value, watch.price, data.result.holding);
    var negative_excursion = drawdown(minute.value, watch.price, data.result.holding);
    return _.extend(data, {
        result: _.extend(data.result, {
            exposure: exposure,
            performance: performance,
            positive_excursion: positive_excursion,
            negative_excursion: negative_excursion
        })
    });
}

function runup(interval, entry, signals) {
    var lowest = entry;
    return avg(signals.reduce(function(runup, item){
        var point = item[interval];
        if (!point) return runup;
        var year = point.asof.substring(0, 4);
        if (_.isUndefined(runup[year]) && !_.isEmpty(runup)) {
            lowest = point.open;
        }
        return [point.open, point.high, point.low, point.close].reduce(function(runup, price){
            if (price < lowest) {
                lowest = price;
            } else {
                var value = (price - lowest) / lowest * 100;
                runup[year] = Math.max(value, runup[year] || 0);
            }
            return runup;
        }, runup);
    }, {}));
}

function drawdown(interval, entry, signals) {
    var highest = entry;
    return avg(signals.reduce(function(drawdown, item){
        var point = item[interval];
        if (!point) return drawdown;
        var year = point.asof.substring(0, 4);
        if (_.isUndefined(drawdown[year]) && !_.isEmpty(drawdown)) {
            highest = point.open;
        }
        return [point.open, point.low, point.high, point.close].reduce(function(drawdown, price){
            if (price > highest) {
                highest = price;
            } else {
                var value = (price - highest) / highest * 100;
                drawdown[year] = Math.min(value, drawdown[year] || 0);
            }
            return drawdown;
        }, drawdown);
    }, {}));
}

function avg(numbers) {
    return _.reduce(numbers, function(sum, num){
        return sum + num;
    }, 0) / _.size(numbers);
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
            var results = _.pluck(bars, 'result');
            return _.extend(combineResult(bars), {
                result: results.reduce(function(result, bar, i) {
                    if (!bar) return result;
                    var lastTrade = bar.lastTrade && result.lastTrade ?
                        minDate(bar.lastTrade, result.lastTrade) :
                        bar.lastTrade || result.lastTrade || undefined;
                    return _.extend(result, _.object([
                        intervals[i], 'incomplete', 'latest', 'lastTrade', 'price', 'asof', 'until'
                    ], [
                        bar,
                        bar.incomplete || result.incomplete,
                        bar.latest,
                        lastTrade,
                        result.asof && ltDate(bar.asof, result.asof) ?
                            result.price : bar.close,
                        maxDate(bar.asof, result.asof || bar.asof),
                        minDate(bar.until, result.until || bar.until)
                    ]));
                }, {})
            });
        });
    };
}

function loadBar(parseCalculation, open, failfast, upper, cache, security, period, after, expressions, asof, until) {
    if (!cache[period.value] ||
            ltDate(cache[period.value].upper, asof) ||
            ltDate(asof, cache[period.value].lower)) {
        var end = maxDate(asof, minDate(period.inc(asof, 100), upper));
        var date = new Date(end);
        var day = date.getDay(); // skip over weekends and holidays
        var inc = day === 0 ? 3 : day == 4 ? 4 : day == 5 ? 3 : 2;
        date.setDate(date.getDate() + inc);
        var advance = date.toISOString();
        cache[period.value] = {
            lower: asof,
            upper: maxDate(asof, period.dec(end,1)),
            promise: loadData(parseCalculation.bind(this, security.exchange), open, failfast, security,
                2, asof, advance, period, expressions)
        };
    }
    return cache[period.value].promise.then(function(data){
        if (_.isEmpty(data.result)) return _.extend({}, data, {
            result: undefined
        });
        var ar = data.result;
        var idx = _.sortedIndex(ar, {
            asof: toISOString(asof)
        }, 'asof');
        if (idx && (idx >= ar.length || ltDate(asof, ar[idx].asof))) {
            idx--;
        }
        if (idx+1 < ar.length && ltDate(ar[idx].asof, after)) {
            idx++;
        }
        if (ltDate(until, ar[idx].asof)) return _.extend({}, data, {
            result: undefined
        });
        else if (idx+1 < ar.length) return _.extend({}, data, {
            result: _.extend(ar[idx], {
                since: idx ? ar[idx-1].asof : ar[idx].since,
                until: ar[idx+1].asof
            })
        });
        else return _.extend({}, data, {
            result: _.extend(ar[idx], {
                since: idx ? ar[idx-1].asof : ar[idx].since,
                until: ar[idx].until || period.inc(ar[idx].asof, 1),
                latest: true
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

function findSignals(periods, load, security, criteria, begin, end) {
    var watch = findWatchSignal.bind(this, periods, load, criteria);
    var stop = findStopSignal.bind(this, periods, load, criteria);
    var hold = findHoldSignals.bind(this, periods, load, criteria);
    return screenSignals(security, watch, hold, stop, begin, end);
}

function screenSignals(security, watch, hold, stop, begin, end) {
    return watch(begin, end).then(function(ws){
        if (!ws.result) return ws;
        return stop(ws.result, ws.result.asof, end).then(function(ss){
            var last = ss.result ? ss.result.asof : ws.result.asof;
            var stopped = ss.result ? ss.result.until : end;
            return hold(ws.result, ws.result.asof, stopped).then(function(hs) {
                if (_.isEmpty(hs.result) && _.isEmpty(ss.result))
                    return _.extend(ws, {
                        result: {watch: ws.result}
                    });
                var w = deepExtend(hs.result.shift(), ws.result);
                var s = ss.result ? deepExtend(_.last(hs.result), ss.result) : undefined;
                var secondLast = hs.result.length > 1 ? hs.result[hs.result.length-2] : undefined;
                return _.extend(combineResult([ws, ss]), {
                    result: {
                        watch: w,
                        holding: hs.result,
                        hold: s ? secondLast : _.last(hs.result),
                        stop: s
                    }
                });
            });
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

function findStopSignal(periods, load, filters, watch, begin, end){
    return findSignal(periods, load, 'stop', filters, watch, begin, end);
}

function findHoldSignals(periods, load, filters, watch, begin, end) {
    return findSignal(periods, load, 'hold', filters, watch, begin, end).then(function(first) {
        if (!first.result) return _.extend(first, {
            result: []
        });
        if (ltDate(end, first.result.until, true) || ltDate(first.result.until, begin, true))
            return _.extend(first, {
                result: [first.result]
            });
        return findHoldSignals(periods, load, filters, watch, first.result.until, end).then(function(rest) {
            rest.result.unshift(first.result);
            return rest;
        });
    }).then(function(data){
        if (_.isEmpty(data.result)) return data;
        return _.extend(data, {
            result: data.result.map(addGainPain.bind(this, filters, watch))
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

function findSignal(periods, load, signal, filters, watch, begin, end){
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
    return filterSecurityByPeriods(load, signal, watch, sorted.map(function(interval) {
        return {
            period: periods[interval],
            filters: byInterval[interval] || []
        };
    }), new Date(0), begin, end).then(function(data){
        if ((!data.result || ltDate(data.result.asof, begin)) && ltDate(data.result.until, end) && ltDate(begin, data.result.until))
            return findSignal(periods, load, signal, filters, watch, data.result.until, end);
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
        else return data;
    });
}

function filterSecurityByPeriods(load, signal, watch, periodsAndFilters, after, begin, upper) {
    if (ltDate(upper, begin))
        throw Error("Assert error " + upper + " is less than " + begin);
    var rest = _.rest(periodsAndFilters);
    var period = _.first(periodsAndFilters).period;
    var filters = _.first(periodsAndFilters).filters;
    return findNextSignal(load, signal, !rest.length, period, filters, watch, after, begin, upper).then(function(data){
        if (!data.result || !data.result[period.value]) return data;
        if (data.passed === false || !rest.length) return data;
        var start = data.result[period.value].asof;
        if (ltDate(upper, maxDate(start, begin), true)) {
            // couldn't find signal, end of period
            return _.extend({}, data, {
                passed: undefined
            });
        }
        var through = data.result[period.value].until;
        return filterSecurityByPeriods(load, signal, watch, rest, start, maxDate(start, begin), minDate(upper, through)).then(function(child){
            if (ltDate(upper, through) || ltDate(through, begin, true) ||
                    signal == 'watch' && child.passed ||
                    signal == 'stop' && child.passed == false ||
                    signal == 'hold') return _.extend({}, child, {
                status: child.status == "success" ? data.status : child.status,
                quote: _.compact(_.flatten([data.quote, child.quote])),
                result: child.result
            });
            // couldn't find a signal, try next period
            return filterSecurityByPeriods(load, signal, watch, periodsAndFilters, after, through, upper);
        });
    });
}

function findNextSignal(load, signal, leaf, period, filters, watch, after, begin, until) {
    if (signal == 'watch')
        return findNextActiveFilter(true, load, period, filters, watch, after, begin, until);
    else if (signal == 'stop' && leaf)
        return findNextActiveFilter(false, load, period, filters, watch, after, begin, until);
    else if (signal == 'stop')
        return loadFilteredPoint(load, period, filters, watch, after, begin, until);
    else if (signal == 'hold')
        return load(period, after, begin, until);
    else throw Error("Unknown signal: " + signal);
}

function findNextActiveFilter(pass, load, period, filters, watch, after, begin, until) {
    if (ltDate(until, begin))
        throw Error("Assert error " + until + " is less than " + begin);
    return loadFilteredPoint(load, period, filters, watch, after, begin, until).then(function(data){
        if (!data.result || !data.result[period.value])
            return data;
        var through = data.result[period.value].until;
        if (data.result[period.value].latest)
            return data;
        if (pass != data.passed && ltDate(through, until))
            return findNextActiveFilter(pass, load, period, filters, watch, after, through, until);
        else return data;
    });
}

function loadFilteredPoint(load, period, filters, watch, after, begin, until) {
    return load(period, after, minDate(begin,until), until).then(function(data){
        if (!data.result || !data.result[period.value]) return data;
        var pass =_.reduce(filters, function(pass, criteria) {
            if (!pass) return false;
            var hold = data.result;
            var w = _.isEmpty(watch) ? hold : watch; // is 'watch' signal?
            var value = valueOfCriteria(criteria, w, hold);
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
    return open(security, period.value, 'readonly', collect.bind(this, length, lower, upper)).then(function(result){
        var next = result.length ? period.inc(_.last(result).asof, 1) : null;
        var below = lengthBelow(result, lower);
        if (below >= length && next && (ltDate(upper, next) || ltDate(Date.now(), next))) {
            // result complete
            return {
                status: 'success',
                result: result
            };
        } else if (result.length && below >= length) {
            // need to update with newer data
            var last = _.last(result);
            return collectAggregateRange(open, failfast, security, period, 2, last.asof, upper).then(function(aggregated){
                return storeNewData(open, security, period, aggregated.result).then(function(){
                    return open(security, period.value, 'readonly', collect.bind(this, length, lower, upper));
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
                    return open(security, period.value, 'readonly', collect.bind(this, 1, first, last));
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
            var preceding = _.last(result);
            if (!preceding || ltDate(upper, point.asof)) {
                upper = ceil(point.asof);
                result.push(_.extend({}, point, {
                    asof: upper
                }));
                count = 0;
            } else {
                var lastTrade = point.lastTrade && preceding.lastTrade ?
                    minDate(point.lastTrade, preceding.lastTrade) :
                    point.lastTrade || preceding.lastTrade || undefined;
                result[result.length-1] = {
                    asof: upper,
                    open: preceding.open,
                    close: point.close,
                    total_volume: point.total_volume,
                    high: Math.max(preceding.high, point.high),
                    low: Math.min(preceding.low, point.low),
                    volume: period.value.charAt(0) == 'd' ?
                        Math.round((preceding.volume * count + point.volume) / (++count)) :
                        (preceding.volume + point.volume),
                    incomplete: preceding.incomplete || point.incomplete || undefined,
                    lastTrade: lastTrade
                };
            }
            return result;
        }, []);
        if (result.length && ltDate(_.last(result).asof, upper)) {
            result.pop(); // last period is beyond upper
        } else if (result.length && ltDate(_.last(data.result).asof, _.last(result).asof)) {
            _.last(result).incomplete = true; // last period is not yet complete
        }
        return _.extend(data, {
            result: result
        });
    });
}

function collectRawRange(open, failfast, security, period, length, lower, upper) {
    return open(security, period.value, 'readonly', collect.bind(this, Math.max(length,3), lower, upper)).then(function(result){
        var conclude = failfast ? Promise.reject.bind(Promise) : Promise.resolve.bind(Promise);
        var next = result.length ? period.inc(_.last(result).asof, 1) : null;
        var below = lengthBelow(result, lower);
        if (below >= length && next && (ltDate(upper, next) || ltDate(new Date(), next))) {
            // result complete
            return {
                status: 'success',
                result: result
            };
        } else if (result.length && below >= length) {
            return open(security, period.value, 'readonly', nextItem.bind(this, upper)).then(function(newer){
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
                        start: period.format(_.first(_.last(result, 3)).asof)
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
                    start: period.format(_.first(_.last(result, 3)).asof)
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
    var ex = security.exchange;
    var points = result.map(function(point){
        if (point.asof && !point.dateTime && !point.date)
            throw Error("No date for point " + JSON.stringify(point));
        var obj = _.omit(point, function(value){
            return !_.isFinite(value);
        });
        var tz = point.tz || period.tz;
        var dateTime = point.dateTime ? moment.tz(point.dateTime, tz) :
            moment.tz(point.date + ' ' + period.marketClosesAt, tz);
        obj.asof = period.ceil(dateTime);
        if (point.incomplete) {
            obj.incomplete = point.incomplete;
            var lastTrade = moment.tz(point.lastTrade, tz);
            obj.lastTrade = toISOString(lastTrade);
            // linear estimation of volume
            var start = period.floor(lastTrade);
            var end = object.asof;
            if (start != end) {
                var opens = moment.tz(dateTime.format('YYYY-MM-DD') + 'T' + ex.marketOpensAt, ex.tz);
                var closes = moment.tz(dateTime.format('YYYY-MM-DD') + 'T' + ex.marketClosesAt, ex.tz);
                var s = Math.max(moment(start).valueOf(), opens.valueOf());
                var e = Math.min(moment(end).valueOf(), closes.valueOf());
                var percent = (lastTrade.valueOf() - s) / (e - s);
                obj.volume = point.volume + point.volume * (1 - percent);
            }
        }
        return obj;
    });
    return storeNewData(open, security, period, points).then(function(){
        return {
            status: 'success'
        };
    }).then(function(){
        return Promise.all(period.dependents.map(function(dependent){
            return removeIncomplete(open, security, dependent);
        }));
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
                +_.first(bounds) + ' - ' + _.last(bounds) + ' in ' + security.ticker + '#' + period.value);
        else return data.filter(function(point){
            return point.asof < _.first(bounds) || point.asof > _.last(bounds);
        });
    }).then(storeData.bind(this, open, security, period));
}

function storeData(open, security, period, data) {
    if (!data.length) return Promise.resolve(data);
    console.log("Storing", data.length, period.value, security, _.last(data));
    return removeIncomplete(open, security, period.value, function(store, resolve, reject){
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

function removeIncomplete(open, security, storeName, callback) {
    return open(security, storeName, "readwrite", function(store, resolve, reject){
        var cursor = store.openCursor(null, "prev");
        var incompletes = [];
        cursor.onerror = reject;
        cursor.onsuccess = function(event) {
            try {
                var cursor = event.target.result;
                if (cursor && cursor.value.incomplete) {
                    incompletes.push(cursor.value);
                    cursor.continue();
                } else {
                    var remove = function() {
                        if (incompletes.length) {
                            var req = store.delete(incompletes.pop().asof);
                            req.onerror = reject;
                            req.onsuccess = remove;
                        } else if (_.isFunction(callback)) {
                            callback(store, resolve, reject);
                        } else {
                            resolve();
                        }
                    };
                    remove();
                }
            } catch (e) {
                reject(e);
            }
        };
    });
}

function bounds(open, security, period) {
    return open(security, period.value, 'readonly', function(store, resolve, reject){
        var forward = store.openCursor();
        forward.onerror = reject;
        forward.onsuccess = function(event) {
            try {
                var forward = event.target.result;
                if (forward && forward.value.incomplete) {
                    forward.continue();
                } else if (forward) {
                    var earliest = forward.value;
                    var backward = store.openCursor(null, "prev");
                    backward.onerror = reject;
                    backward.onsuccess = function(event) {
                        try {
                            var backward = event.target.result;
                            if (backward && backward.value.incomplete) {
                                backward.continue();
                            } else if (backward) {
                                var latest = backward.value;
                                resolve([earliest.asof, latest.asof]);
                            } else {
                                throw Error("Inconsistent state");
                            }
                        } catch (e) {
                            reject(e);
                        }
                    };
                } else {
                    resolve();
                }
            } catch (e) {
                reject(e);
            }
        };
    });
}

function openSymbolDatabase(indexedDB, storeNames, security, storeName, mode, callback) {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open(security.iri, 13);
        request.onerror = reject;
        request.onupgradeneeded = function(event) {
            try {
                var db = event.target.result;
                // Clear the database to re-download everything
                for (var i=db.objectStoreNames.length -1; i>=0; i--) {
                    var name = db.objectStoreNames[i];
                    if (name.match(/^[a-z][0-9]+$/)) {
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
                var trans = db.transaction(storeName, mode);
                return callback(trans.objectStore(storeName), resolve, reject);
            } catch(e) {
                reject(e);
            }
        };
    });
}

function collect(below, lower, upper, store, resolve, reject) {
    var results = [];
    var between = 0;
    var cursor = store.openCursor(upper ? IDBKeyRange.upperBound(toISOString(upper)) : null, "prev");
    cursor.onerror = reject;
    cursor.onsuccess = function(event) {
        try {
            var cursor = event.target.result;
            if (cursor) {
                if (lower && ltDate(lower, cursor.value.asof)) {
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
    var dependents = _.pluck(_.filter(intervals, function(i) {
        return i.derivedFrom && i.derivedFrom.value == interval;
    }), 'value');
    return period && _.extend(self, period, {
        value: period.value,
        millis: period.millis,
        tz: exchange.tz,
        marketClosesAt: exchange.marketClosesAt,
        derivedFrom: period.derivedFrom && createPeriod(intervals, exchange, period.derivedFrom.value),
        dependents: dependents,
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

// calculations.js
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

var parseCalculation = (function(_) {
    var calculations = {
        unknown: function(ex, interval, expression) {
            return {
                getErrorMessage: function() {
                    return "Expression is unknown: " + expression;
                },
                getFields: function() {
                    return [];
                },
                getDataLength: function() {
                    return 0;
                },
                getValue: function(points) {
                    return undefined;
                }
            };
        },
        identity: function(ex, interval, field) {
            return {
                getErrorMessage: function() {
                    if (!_.isString(field) || !field.match(/^[0-9a-z\_\-&]+$/))
                        return "Must be a field: " + field;
                    return null;
                },
                getFields: function() {
                    return [field];
                },
                getDataLength: function() {
                    return 1;
                },
                getValue: function(points) {
                    return points[0][field];
                }
            };
        },
        finite: function(ex, interval, number) {
            return {
                getErrorMessage: function() {
                    if (!_.isFinite(number))
                        return "Must be a number: " + number;
                    return null;
                },
                getFields: function() {
                    return [];
                },
                getDataLength: function() {
                    return 1;
                },
                getValue: function(points) {
                    return +number;
                }
            };
        },
        WORKDAY: function(ex, interval, asof) {
            return {
                getErrorMessage: function() {
                    if (!_.isString(asof) || !asof.match(/^[0-9a-z_\-&]+$/))
                        return "Must be a field: " + asof;
                    return null;
                },
                getFields: function(){
                    return [asof];
                },
                getDataLength: function() {
                    return 1;
                },
                getValue: function(points) {
                    var start = moment(points[0][asof]).tz(ex.tz);
                    var noon = moment(start).millisecond(0).second(0).minute(0).hour(12);
                    var zero = moment.tz('1970-01-01', ex.tz).startOf('isoWeek');
                    var weeks = start.diff(zero, 'weeks');
                    var days = start.isoWeekday() - 1;
                    if (days > 4) return weeks * 5 + 5;
                    var hours = (start.valueOf() - noon.valueOf()) /1000 /60 /60 +12;
                    return weeks*5 + days + hours/24;
                }
            };
        },
        HOUR: function(ex, interval, asof) {
            return {
                getErrorMessage: function() {
                    if (!_.isString(asof) || !asof.match(/^[0-9a-z_\-&]+$/))
                        return "Must be a field: " + asof;
                    return null;
                },
                getFields: function(){
                    return [asof];
                },
                getDataLength: function() {
                    return 1;
                },
                getValue: function(points) {
                    // pivot around noon as leap seconds/hours occur at night
                    var start = moment(points[0][asof]).tz(ex.tz);
                    var noon = moment(start).millisecond(0).second(0).minute(0).hour(12);
                    return (start.valueOf() - noon.valueOf()) /1000 /60 /60 +12;
                }
            };
        },
        /* Prior value N days ago */
        PRIOR: function(ex, interval, d, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(d))
                        return "Must be a positive integer: " + d;
                    return calc.getErrorMessage();
                },
                getFields: function(){
                    return ['asof'].concat(calc.getFields());
                },
                getDataLength: function() {
                    var opens = moment.tz('2010-03-01T' + ex.marketOpensAt, ex.tz);
                    var closes = moment.tz('2010-03-01T' + ex.marketClosesAt, ex.tz);
                    var dayLength = interval.diff(ex, closes, opens);
                    var n = d * dayLength * 1.5; // extra for after hours activity
                    return n + calc.getDataLength();
                },
                getValue: function(points) {
                    var prior = intervals.d1.dec(ex, _.last(points).asof, d);
                    var closes = prior.format('YYYY-MM-DD') + 'T' + ex.marketClosesAt;
                    var asof = moment.tz(closes, ex.tz).toISOString();
                    var end = _.sortedIndex(points, {
                        asof: asof
                    }, 'asof');
                    if (points[end] && points[end].asof == asof) end++;
                    var start = Math.max(end - calc.getDataLength(), 0);
                    return getValues(n, calc, points.slice(start, end));
                }
            };
        },
        /* Since N days ago */
        SINCE: function(ex, interval, d, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(d))
                        return "Must be a possitive integer: " + d;
                    return calc.getErrorMessage();
                },
                getFields: function(){
                    return ['asof'].concat(calc.getFields());
                },
                getDataLength: function() {
                    var opens = moment.tz('2010-03-01T' + ex.marketOpensAt, ex.tz);
                    var closes = moment.tz('2010-03-01T' + ex.marketClosesAt, ex.tz);
                    var dayLength = interval.diff(ex, closes, opens);
                    var n = d * dayLength * 1.5; // extra for after hours activity
                    return Math.max(n, calc.getDataLength());
                },
                getValue: function(points) {
                    var since = intervals.d1.dec(ex, _.last(points).asof, d - 1);
                    var opens = moment.tz(since.format('YYYY-MM-DD') + 'T' + ex.marketOpensAt, ex.tz);
                    var asof = opens.toISOString();
                    var start = _.sortedIndex(points, {
                        asof: asof
                    }, 'asof');
                    if (points[start] && points[start].asof == asof) start++;
                    if (start >= points.length) return getValue(calc, points);
                    var end = Math.min(start + calc.getDataLength(), points.length);
                    return getValue(calc, points.slice(start, end));
                }
            };
        },
        /* Maximum */
        MAX: function(ex, interval, n, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return calc.getErrorMessage();
                },
                getFields: calc.getFields.bind(calc),
                getDataLength: function() {
                    return n + calc.getDataLength() - 1;
                },
                getValue: function(points) {
                    return _.max(getValues(n, calc, points));
                }
            };
        },
        /* Minimum */
        MIN: function(ex, interval, n, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return calc.getErrorMessage();
                },
                getFields: calc.getFields.bind(calc),
                getDataLength: function() {
                    return n + calc.getDataLength() - 1;
                },
                getValue: function(points) {
                    return _.min(getValues(n, calc, points));
                }
            };
        },
        /* Returns the sign of a number. Returns 1 if the number is positive, -1 if negative and 0 if zero. */
        SIGN: function(ex, interval, field) {
            var calc = getCalculation(ex, interval, field, arguments, 3);
            return {
                getErrorMessage: function() {
                    return calc.getErrorMessage();
                },
                getFields: calc.getFields.bind(calc),
                getDataLength: function() {
                    return calc.getDataLength();
                },
                getValue: function(points) {
                    var value = calc.getValue(points);
                    if (value > 0) return 1;
                    if (value < 0) return -1;
                    else return value;
                }
            };
        },
        /* Addition */
        ADD: function(ex, interval, number, field) {
            var n = getCalculation(ex, interval, number);
            var d = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    return n.getErrorMessage() || d.getErrorMessage();
                },
                getFields: function() {
                    return n.getFields().concat(d.getFields());
                },
                getDataLength: function() {
                    return Math.max(n.getDataLength(), d.getDataLength());
                },
                getValue: function(points) {
                    return getValue(n, points) + getValue(d, points);
                }
            };
        },
        /* Subtraction */
        SUBTRACT: function(ex, interval, number, field) {
            var n = getCalculation(ex, interval, number);
            var d = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    return n.getErrorMessage() || d.getErrorMessage();
                },
                getFields: function() {
                    return n.getFields().concat(d.getFields());
                },
                getDataLength: function() {
                    return Math.max(n.getDataLength(), d.getDataLength());
                },
                getValue: function(points) {
                    return getValue(n, points) - getValue(d, points);
                }
            };
        },
        /* Multiplication */
        MULTIPLY: function(ex, interval, number, field) {
            var n = getCalculation(ex, interval, number);
            var d = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    return n.getErrorMessage() || d.getErrorMessage();
                },
                getFields: function() {
                    return n.getFields().concat(d.getFields());
                },
                getDataLength: function() {
                    return Math.max(n.getDataLength(), d.getDataLength());
                },
                getValue: function(points) {
                    return getValue(n, points) * getValue(d, points);
                }
            };
        },
        /* Percent ratio */
        PERCENT: function(ex, interval, numerator, denominator) {
            var n = getCalculation(ex, interval, numerator);
            var d = getCalculation(ex, interval, denominator);
            return {
                getErrorMessage: function() {
                    return n.getErrorMessage() || d.getErrorMessage();
                },
                getFields: function() {
                    return n.getFields().concat(d.getFields());
                },
                getDataLength: function() {
                    return Math.max(n.getDataLength(), d.getDataLength());
                },
                getValue: function(points) {
                    var num = getValue(n, points);
                    var den = getValue(d, points);
                    return num * 100 / den;
                }
            };
        },
        /* Age Of High */
        AOH: function(ex, interval, n) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return null;
                },
                getFields: function() {
                    return ['high'];
                },
                getDataLength: function() {
                    return n;
                },
                getValue: function(points) {
                    var highs = _.pluck(points, 'high');
                    var highest = _.max(highs);
                    return points.length - highs.indexOf(highest);
                }
            };
        },
        /* Convergence-Divergence Oscillator @deprecated */
        CDO: function(ex, interval, s, l, field) {
            var args = Array.prototype.slice.call(arguments, 2);
            var short = getCalculation(ex, interval, field, [s].concat(args.slice(3)));
            var long = getCalculation(ex, interval, field, [l].concat(args.slice(3)));
            return {
                getErrorMessage: function() {
                    if (short.getErrorMessage())
                        return short.getErrorMessage();
                    return long.getErrorMessage();
                },
                getFields: long.getFields.bind(long),
                getDataLength: function() {
                    return Math.max(short.getDataLength(), long.getDataLength());
                },
                getValue: function(points) {
                    return getValue(short, points) - getValue(long, points);
                }
            };
        },
        /* Percentage Change Oscillator @deprecated */
        PCO: function(ex, interval, n, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return calc.getErrorMessage();
                },
                getFields: calc.getFields.bind(calc),
                getDataLength: function() {
                    return n + calc.getDataLength();
                },
                getValue: function(points) {
                    if (points.length <= n) return undefined;
                    var current = getValue(calc, points);
                    var previous = getValue(calc, points.slice(0, points.length - n));
                    return (current - previous) * 100 / Math.abs(previous);
                }
            };
        },
        /* Percentage Maximum Oscillator @deprecaded */
        PMO: function(ex, interval, n, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return calc.getErrorMessage();
                },
                getFields: calc.getFields.bind(calc),
                getDataLength: function() {
                    return n + calc.getDataLength();
                },
                getValue: function(points) {
                    var values = getValues(n, calc, points.slice(0, points.length - 1));
                    var max = _.max(values);
                    var min = _.min(values);
                    var value = getValue(calc, points);
                    if (min < 0)
                        return (value - max) * 100 / (Math.max(max, 0) - min);
                    if (max > 0)
                        return (value - max) * 100 / max;
                    return 0;
                }
            };
        },
        /* Percentage above Low @deprecaded */
        PLOW: function(ex, interval, n, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return calc.getErrorMessage();
                },
                getFields: function() {
                    return ['low'].concat(calc.getFields());
                },
                getDataLength: function() {
                    return n + calc.getDataLength();
                },
                getValue: function(points) {
                    var lowest = _.min(_.pluck(points.slice(-n), 'low'));
                    var value = getValue(calc, points);
                    return (value - lowest) * 100 / lowest;
                }
            };
        },
        /* Stochastic Oscillator @deprecated */
        STO: function(ex, interval, n, s1, s2) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    if (!isPositiveInteger(s1))
                        return "Must be a positive integer: " + s1;
                    if (!isPositiveInteger(s2))
                        return "Must be a positive integer: " + s2;
                    return null;
                },
                getFields: function() {
                    return ['high', 'low', 'close'];
                },
                getDataLength: function() {
                    return n + s1 - 1 + s2 - 1;
                },
                getValue: function(points) {
                    var p2 = _.range(s2).map(function(i) {
                        var p1 = _.range(s1).map(function(j){
                            var end = points.length - i - j;
                            var start = Math.max(end - n, 0);
                            var sliced = points.slice(start, Math.max(end,start+1));
                            var highest = _.max(_.pluck(sliced, 'high'));
                            var lowest = _.min(_.pluck(sliced, 'low'));
                            var close = _.last(sliced).close;
                            return (close - lowest) * 100 / (highest - lowest);
                        });
                        return sum(p1) / p1.length;
                    });
                    return sum(p2) / p2.length;
                }
            };
        },
        /* Simple Moveing Average */
        SMA: function(ex, interval, n, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return calc.getErrorMessage();
                },
                getFields: calc.getFields.bind(calc),
                getDataLength: function() {
                    return n + calc.getDataLength() - 1;
                },
                getValue: function(points) {
                    var values = getValues(n, calc, points);
                    return sum(values) / values.length;
                }
            };
        },
        /* Exponential Moveing Average */
        EMA: function(ex, interval, n, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return calc.getErrorMessage();
                },
                getFields: calc.getFields.bind(calc),
                getDataLength: function() {
                    return n * 10 + calc.getDataLength() - 1;
                },
                getValue: function(points) {
                    var values = getValues(n * 10, calc, points);
                    var a = 2 / (n + 1);
                    var firstN = values.slice(0, n);
                    var sma = _.reduce(firstN, function(memo, value, index){
                        return memo + value;
                    }, 0) / firstN.length;
                    return _.reduce(values.slice(n), function(memo, value, index){
                        return a * value + (1 - a) * memo;
                    }, sma);
                }
            };
        },
        /* Weighted On Blanance Volume */
        OBV: function(ex, interval, n) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return null;
                },
                getFields: function() {
                    return ['volume','close'];
                },
                getDataLength: function() {
                    return n * 10;
                },
                getValue: function(points) {
                    var numerator = points.reduce(function(p, point, i, points){
                        if (i === 0) return 0;
                        var prior = points[i - 1];
                        if (point.close > prior.close)
                            return p + (i + 1) * point.volume;
                        if (point.close < prior.close)
                            return p - (i + 1) * point.volume;
                        return p;
                    }, 0);
                    return numerator / (points.length * (points.length - 1)) * 2;
                }
            };
        },
        /* Relative Strength Index */
        RSI: function(ex, interval, n, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return calc.getErrorMessage();
                },
                getFields: function() {
                    return calc.getFields();
                },
                getDataLength: function() {
                    return n +250 + calc.getDataLength();
                },
                getValue: function(points) {
                    var values = getValues(n +250, calc, points);
                    var gains = values.map(function(value, i, values){
                        var change = value - values[i-1];
                        if (change > 0) return change;
                        return 0;
                    }).slice(1);
                    var losses = values.map(function(value, i, values){
                        var change = value - values[i-1];
                        if (change < 0) return change;
                        return 0;
                    }).slice(1);
                    var firstGains = gains.slice(0, n);
                    var firstLosses = losses.slice(0, n);
                    var gain = gains.slice(n).reduce(function(smoothed, gain){
                        return (smoothed * (n-1) + gain) / n;
                    }, sum(firstGains) / firstGains.length);
                    var loss = losses.slice(n).reduce(function(smoothed, loss){
                        return (smoothed * (n-1) + loss) / n;
                    }, sum(firstLosses) / firstLosses.length);
                    if (loss === 0) return 100;
                    return 100 - (100 / (1 - (gain / loss)));
                }
            };
        },
        /* Average True Range */
        ATR: function(ex, interval, n) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return null;
                },
                getFields: function() {
                    return ['high', 'low','close'];
                },
                getDataLength: function() {
                    return n + 250;
                },
                getValue: function(points) {
                    var ranges = points.map(function(point,i,points) {
                        var previous = points[i-1];
                        if (!previous) return point.high - point.low;
                        return Math.max(
                            point.high - point.low,
                            Math.abs(point.high - previous.close),
                            Math.abs(point.low - previous.close)
                        );
                    });
                    var first = ranges.slice(0,n);
                    return ranges.slice(n).reduce(function(atr, range){
                        return (atr * (n-1) + range) / n;
                    }, sum(first) / first.length);
                }
            };
        },
        /* Difference over ATR @deprecaded */
        DATR: function(ex, interval, n, field) {
            var ATR = getCalculation(ex, interval, 'ATR', arguments, 2);
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    return ATR.getErrorMessage() || calc.getErrorMessage();
                },
                getFields: function() {
                    return ['close'].concat(ATR.getFields(), calc.getFields());
                },
                getDataLength: function() {
                    return Math.max(ATR.getDataLength(), calc.getDataLength());
                },
                getValue: function(points) {
                    var value = getValue(calc, points);
                    var close = _.last(points).close;
                    var atr = getValue(ATR, points);
                    return (close - value) / atr;
                }
            };
        },
        /* Standard Deviation */
        STDEV: function(ex, interval, n, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return calc.getErrorMessage();
                },
                getFields: function() {
                    return calc.getFields();
                },
                getDataLength: function() {
                    return n - 1 + calc.getDataLength();
                },
                getValue: function(points) {
                    var prices = getValues(n, calc, points);
                    var avg = sum(prices) / prices.length;
                    var sd = Math.sqrt(sum(prices.map(function(num){
                        var diff = num - avg;
                        return diff * diff;
                    })) / Math.max(prices.length,1));
                    return sd || 1;
                }
            };
        },
        /* Keltner Channel @deprecaded */
        KELT: function(ex, interval, centre, unit) {
            var ATR = getCalculation(ex, interval, unit, arguments, 5);
            var calc = getCalculation(ex, interval, centre);
            return {
                getErrorMessage: function() {
                    return ATR.getErrorMessage() || calc.getErrorMessage();
                },
                getFields: function() {
                    return ['close'].concat(ATR.getFields(), calc.getFields());
                },
                getDataLength: function() {
                    return Math.max(1, ATR.getDataLength(), calc.getDataLength());
                },
                getValue: function(points) {
                    var value = getValue(calc, points);
                    var atr = getValue(ATR, points);
                    return (_.last(points).close - value) * 100 / atr;
                }
            };
        },
        /* Bollinger BandWidth @deprecaded */
        BBWidth: function(ex, interval, centre, multiplier, unit) {
            var ATR = getCalculation(ex, interval, unit, arguments, 5);
            var calc = getCalculation(ex, interval, centre);
            return {
                getErrorMessage: function() {
                    if (!_.isNumber(multiplier) || multiplier != Math.round(multiplier))
                        return "Must be an integer: " + multiplier;
                    return ATR.getErrorMessage() || calc.getErrorMessage();
                },
                getFields: function() {
                    return [].concat(ATR.getFields(), calc.getFields());
                },
                getDataLength: function() {
                    return Math.max(ATR.getDataLength(), calc.getDataLength());
                },
                getValue: function(points) {
                    var value = getValue(calc, points);
                    var atr = getValue(ATR, points);
                    var close = _.last(points).close;
                    var lowerBB = value - multiplier * atr;
                    var upperBB = value + multiplier * atr;
                    return 100 * (upperBB - lowerBB) / value;
                }
            };
        },
        /* %B @deprecaded */
        PercentB: function(ex, interval, centre, multiplier, unit) {
            var ATR = getCalculation(ex, interval, unit, arguments, 5);
            var calc = getCalculation(ex, interval, centre);
            return {
                getErrorMessage: function() {
                    if (!_.isNumber(multiplier) || multiplier != Math.round(multiplier))
                        return "Must be an integer: " + multiplier;
                    return ATR.getErrorMessage() || calc.getErrorMessage();
                },
                getFields: function() {
                    return [].concat(ATR.getFields(), calc.getFields());
                },
                getDataLength: function() {
                    return Math.max(ATR.getDataLength(), calc.getDataLength());
                },
                getValue: function(points) {
                    var value = getValue(calc, points);
                    var atr = getValue(ATR, points);
                    var close = _.last(points).close;
                    var lowerBB = value - multiplier * atr;
                    var upperBB = value + multiplier * atr;
                    return (close - lowerBB) * 100 / (upperBB - lowerBB);
                }
            };
        },
        /* Parabolic SAR */
        PSAR: function(ex, interval, factor, limit, n) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    if (!_.isNumber(factor) || factor <= 0)
                        return "Must be a positive number: " + factor;
                    if (!_.isNumber(limit) || limit <= 0)
                        return "Must be a positive number: " + limit;
                    return null;
                },
                getFields: function() {
                    return ['high','low'];
                },
                getDataLength: function() {
                    return n;
                },
                getValue: function(points) {
                    var up = function(point) {
                        var a = point.high <= this.ep ? this.af :
                            Math.min(this.af + factor, limit);
                        var ep = Math.max(this.ep, point.high);
                        var stop = this.stop + a * (ep - this.stop);
                        return (point.low >= stop) ? {
                            trend: up,
                            stop: stop,
                            ep: ep,
                            af: a
                        } : {
                            trend: down,
                            stop: ep - factor * (ep - point.low),
                            ep: point.low,
                            af: factor
                        };
                    };
                    var down = function(point) {
                        var a = point.low >= this.ep ? this.af :
                            Math.min(this.af + factor, limit);
                        var ep = Math.min(point.low, this.ep);
                        var stop = this.stop - a * (this.stop - ep);
                        return (point.high <= stop) ? {
                            trend: down,
                            stop: stop,
                            ep: ep,
                            af: a
                        } : {
                            trend: up,
                            stop: ep + factor * (point.high -ep),
                            ep: point.high,
                            af: factor
                        };
                    };
                    return points.reduce(function(sar, point) {
                        return sar.trend(point);
                    }, {
                        trend: down,
                        stop: points[0].high,
                        ep: points[0].low,
                        af: factor
                    }).stop;
                }
            };
        },
        /* Stop And Buy */
        SAB: function(ex, interval, factor, limit, n) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    if (!_.isNumber(factor) || factor <= 0)
                        return "Must be a positive number: " + factor;
                    if (!_.isNumber(limit) || limit <= 0)
                        return "Must be a positive number: " + limit;
                    return null;
                },
                getFields: function() {
                    return ['high','low'];
                },
                getDataLength: function() {
                    return n;
                },
                getValue: function(points) {
                    var down = function(point) {
                        var a = point.low >= this.ep ? this.af :
                            Math.min(this.af + factor, limit);
                        var ep = Math.min(point.low, this.ep);
                        var stop = this.stop - a * (this.stop - ep);
                        return (point.high <= stop) ? {
                            trend: down,
                            stop: stop,
                            ep: ep,
                            af: a
                        } : {
                            trend: down,
                            stop: point.high - factor * (point.high - point.low),
                            ep: point.low,
                            af: factor
                        };
                    };
                    return points.reduce(function(sar, point) {
                        return sar.trend(point);
                    }, {
                        trend: down,
                        stop: points[0].high,
                        ep: points[0].low,
                        af: factor
                    }).stop;
                }
            };
        },
        /* Stop And Sell */
        SAS: function(ex, interval, factor, limit, n) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    if (!_.isNumber(factor) || factor <= 0)
                        return "Must be a positive number: " + factor;
                    if (!_.isNumber(limit) || limit <= 0)
                        return "Must be a positive number: " + limit;
                    return null;
                },
                getFields: function() {
                    return ['high','low'];
                },
                getDataLength: function() {
                    return n;
                },
                getValue: function(points) {
                    var up = function(point) {
                        var a = point.high <= this.ep ? this.af :
                            Math.min(this.af + factor, limit);
                        var ep = Math.max(this.ep, point.high);
                        var stop = this.stop + a * (ep - this.stop);
                        return (point.low >= stop) ? {
                            trend: up,
                            stop: stop,
                            ep: ep,
                            af: a
                        } : {
                            trend: up,
                            stop: point.low + factor * (point.high - point.low),
                            ep: point.high,
                            af: factor
                        };
                    };
                    return points.reduce(function(sar, point) {
                        return sar.trend(point);
                    }, {
                        trend: up,
                        stop: points[0].low,
                        ep: points[0].high,
                        af: factor
                    }).stop;
                }
            };
        },
        /* Time Price Opportunity Count percentage */
        TPOC: function(ex, interval, n, field) {
            var calc = getCalculation(ex, interval, field, arguments, 4);
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return calc.getErrorMessage();
                },
                getFields: function() {
                    return ['high','low'].concat(calc.getFields());
                },
                getDataLength: function() {
                    return n - 1 + calc.getDataLength();
                },
                getValue: function(points) {
                    var tpos = getTPOCount(points);
                    var target = getValue(calc, points);
                    var bottom = 0, top = tpos.length-1;
                    while (tpos[bottom].count <= 1 && bottom < top) bottom++;
                    while (tpos[top].count <= 1 && top > bottom) top--;
                    if (bottom >= top) {
                        bottom = 0;
                        top = tpos.length-1;
                    }
                    var step = 0.01;
                    var above = _.range(target+step, tpos[top].price+step, step).reduce(function(above, price){
                        return above + tpoCount(tpos, decimal(price));
                    }, 0);
                    var below = _.range(target-step, tpos[bottom].price-step, -step).reduce(function(below, price){
                        return below + tpoCount(tpos, decimal(price));
                    }, 0);
                    var value = tpoCount(tpos, target);
                    var total = value + above + below;
                    return (value + below) / total * 100;
                }
            };
        },
        /* Daily Point Of Control @deprecated */
        DPOC: function(ex, interval, n) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return null;
                },
                getFields: function() {
                    return ['asof','high','low'];
                },
                getDataLength: function() {
                    return n;
                },
                getValue: function(points) {
                    var end = moment(_.last(points).asof).tz(ex.tz);
                    var start = moment(end).millisecond(0).second(0).minute(0).hour(0);
                    if (end.isSame(start)) {
                        start = start.subtract(1, 'day');
                    }
                    return getPointOfControl(getTPOCount(points.filter(function(point){
                        return start.isBefore(point.asof);
                    })));
                }
            };
        },
        /* Point Of Control */
        POC: function(ex, interval, n) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return null;
                },
                getFields: function() {
                    return ['high','low'];
                },
                getDataLength: function() {
                    return n;
                },
                getValue: function(points) {
                    return getPointOfControl(getTPOCount(points));
                }
            };
        },
        /* Point of Control Oscillator @deprecaded */
        POCO: function(ex, interval, n, s1, s2) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    if (!isPositiveInteger(s1))
                        return "Must be a positive integer: " + s1;
                    if (!isPositiveInteger(s2))
                        return "Must be a positive integer: " + s2;
                    return null;
                },
                getFields: function() {
                    return ['high','low','close'];
                },
                getDataLength: function() {
                    return n + s1 - 1 + s2 - 1;
                },
                getValue: function(points) {
                    var p2 = _.range(s2).map(function(i) {
                        var p1 = _.range(s1).map(function(j){
                            var end = points.length - i - j;
                            var start = Math.max(end - n, 0);
                            var sliced = points.slice(start, Math.max(end,start+1));
                            var tpos = getTPOCount(sliced);
                            var poc = getPointOfControl(tpos);
                            var target = _.last(sliced).close;
                            if (target == poc) return 50;
                            var step = 0.01;
                            var above = _.range(poc+step, tpos[tpos.length-1].price+step, step).reduce(function(above, price){
                                return above + tpoCount(tpos, decimal(price));
                            }, 0);
                            var below = _.range(poc-step, tpos[0].price-step, -step).reduce(function(below, price){
                                return below + tpoCount(tpos, decimal(price));
                            }, 0);
                            var value = tpoCount(tpos, poc);
                            var total = value + above + below;
                            var max = poc, min = poc;
                            while (value < total && (target < min || max < target)) {
                                var up = tpoCount(tpos, decimal(max + step));
                                var down = tpoCount(tpos, decimal(min - step));
                                if (up >= down) {
                                    max = decimal(max + step);
                                    if (min < target && target < max) break;
                                    value += up;
                                }
                                if (down >= up) {
                                    min = decimal(min - step);
                                    if (min < target && target < max) break;
                                    value += down;
                                }
                            }
                            if (target > poc) return 50 + 50 * value / total;
                            else return 50 - 50 * value / total;
                        });
                        return sum(p1) / p1.length;
                    });
                    return sum(p2) / p2.length;
                }
            };
        },
        /* @deprecaded */
        HIGH_VALUE: function(ex, interval, n) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return null;
                },
                getFields: function() {
                    return ['high','low'];
                },
                getDataLength: function() {
                    return n;
                },
                getValue: function(points) {
                    var tpos = getTPOCount(points);
                    var poc = getPointOfControl(tpos);
                    return getValueRange(tpos, poc)[1];
                }
            };
        },
        /* @deprecaded */
        LOW_VALUE: function(ex, interval, n) {
            return {
                getErrorMessage: function() {
                    if (!isPositiveInteger(n))
                        return "Must be a positive integer: " + n;
                    return null;
                },
                getFields: function() {
                    return ['high','low'];
                },
                getDataLength: function() {
                    return n;
                },
                getValue: function(points) {
                    var tpos = getTPOCount(points);
                    var poc = getPointOfControl(tpos);
                    return getValueRange(tpos, poc)[0];
                }
            };
        },
        /* Annual Piotroski F-Score */
        'F-Score': function(ex, interval) {
            function long_term_debt_to_asset_ratio(point) {
                if (!point['long-term_debt']) return 0;
                return point['long-term_debt'] * point.return_on_assets /
                    point.return_on_equity / point.total_stockholders_equity;
            }
            return {
                getErrorMessage: function() {
                    return null;
                },
                getFields: function() {
                    return [
                        'return_on_assets',
                        'operating_cash_flow_mil',
                        'net_income_mil',
                        'current_ratio',
                        'shares_mil',
                        'gross_margin',
                        'asset_turnover',
                        'long-term_debt',
                        'return_on_equity',
                        'total_stockholders_equity'
                    ];
                },
                getDataLength: function() {
                    return 2;
                },
                getValue: function(points) {
                    if (points.length < 2) return undefined;
                    var past = points[points.length - 1];
                    var previous = points[points.length - 2];
                    return (past.return_on_assets > 0 ? 1 : 0) +
                        (past.operating_cash_flow_mil > 0 ? 1 : 0) +
                        (past.return_on_assets > previous.return_on_assets ? 1 : 0) +
                        (past.operating_cash_flow_mil > past.net_income_mil ? 1 : 0) + // FIXME taxes?
                        (long_term_debt_to_asset_ratio(past) <= long_term_debt_to_asset_ratio(previous) ? 1 : 0) +
                        (past.current_ratio > previous.current_ratio ? 1 : 0) +
                        (past.shares_mil <= previous.shares_mil ? 1 : 0) +
                        (past.gross_margin > previous.gross_margin ? 1 : 0) +
                        (past.asset_turnover > previous.asset_turnover ? 1 : 0)
                    ;
                }
            };
        },
        /* Quarter Piotroski F-Score */
        FQScore: function(ex, interval) {
            return {
                getErrorMessage: function() {
                    return null;
                },
                getFields: function() {
                    return [
                    ];
                },
                getDataLength: function() {
                    return 2;
                },
                getValue: function(points) {
                    if (points.length < 2) return undefined;
                    var past = points[points.length - 1];
                    var previous = points[points.length - 2];
                    return [
                        // Profitability Signals
                        past.net_income > 0, // Net Income
                        past.operating_cash_flow_free_cash_flow > 0, // Operating Cash Flow
                        return_on_assets(past) > return_on_assets(previous), // Return on Assets
                        past.operating_cash_flow_free_cash_flow > past.net_income, // Quality of Earnings
                        // Leverage, Liquidity and Source of Funds
                        long_term_debt_to_asset_ratio(past) <= long_term_debt_to_asset_ratio(previous), //Decrease in leverage
                        current_ratio(past) > current_ratio(previous), // Increase in liquidity
                        past.diluted_weighted_average_shares_outstanding <= previous.diluted_weighted_average_shares_outstanding, // Absence of Dilution
                        // Operating Efficiency
                        gross_margin(past) > gross_margin(previous), // Gross Margin
                        asset_turnover(past) > asset_turnover(previous) // Asset Turnover
                    ].reduce(function(score, result){
                        if (result) return score + 1;
                        else return score;
                    }, 0);
                }
            };
            function return_on_assets(point) {
                return point.net_income / point.total_assets;
            }
            function long_term_debt_to_asset_ratio(point) {
                if (!point['total_non-current_liabilities']) return 0;
                return point['total_non-current_liabilities'] / point.total_assets;
            }
            function current_ratio(point) {
                return point.total_current_assets / point.total_current_liabilities;
            }
            function gross_margin(point) {
                return (point.revenue - point.cost_of_revenue) / point.revenue;
            }
            function asset_turnover(point) {
                return point.revenue / point.total_assets;
            }
        }
    };

    return function parseCalculation(exchange, calculation, interval) {
        var int = interval && intervals[interval.value];
        var parsed = parseExpression(calculation);
        if (!parsed)
            return calculations.unknown(exchange, int, calculation);
        else if (typeof parsed == 'string')
            return calculations.identity(exchange, int, calculation);
        var func = parsed[0];
        var args = [exchange, int].concat(parsed.slice(1));
        if (!calculations[func])
            return calculations.unknown(exchange, int, calculation); // unknown function
        return calculations[func].apply(calculations[func], args);
    };

    function parseExpression(expr) {
        if (expr.indexOf('(') < 0 && expr.indexOf(',') < 0) return expr; // field
        var idx = expr.indexOf('(');
        var func = expr.substring(0, idx);
        var params = expr.substring(idx + 1, expr.length - 1);
        var regex = /[0-9A-Za-z\.\-_]+(\(([0-9A-Za-z\.\-_]+(\(([0-9A-Za-z\.\-_]+,?)*\))?,?)*\))?/g;
        var match, split = [];
        if (!expr.match(regex)) {
            return undefined; // incomplete function
        }
        while ((match = regex.exec(params)) !== null) {
            var ex = parseExpression(match[0]);
            if (!ex) return ex;
            split.push(ex);
        }
        return [func].concat(_.map(split, function(value){
            if (typeof value !== 'string') return value;
            if (value.match(/^\-?\d+$/))
                return parseInt(value, 10);
            if (value.match(/^\-?[0-9\.]+$/))
                return parseFloat(value);
            return value;
        }));
    }

    function getValueRange(tpos, poc) {
        var step = 0.01;
        var above = _.range(poc+step, tpos[tpos.length-1].price+step, step).reduce(function(above, price){
            return above + tpoCount(tpos, decimal(price));
        }, 0);
        var below = _.range(poc-step, tpos[0].price-step, -step).reduce(function(below, price){
            return below + tpoCount(tpos, decimal(price));
        }, 0);
        var value = tpoCount(tpos, poc);
        var total = value + above + below;
        var target = 0.7 * (value + above + below);
        var max = poc, min = poc;
        while (value < target) {
            var up = tpoCount(tpos, decimal(max + step));
            var down = tpoCount(tpos, decimal(min - step));
            if (up >= down) {
                max = decimal(max + step);
                value += up;
            }
            if (down >= up) {
                min = decimal(min - step);
                value += down;
            }
        }
        return [
            Math.max(min, tpos[0].price),
            Math.min(max, tpos[tpos.length-1].price)
        ];
    }

    function tpoCount(tpos, price) {
        var i = _.sortedIndex(tpos, {price: price}, 'price');
        if (i == tpos.length) return 0;
        var tpo = tpos[i];
        return tpo.price == price ? tpo.count : tpo.lower;
    }

    function getPointOfControl(tpos) {
        var most = _.max(tpos, 'count').count;
        var min = tpos.length-1;
        var max = 0;
        tpos.forEach(function(w, i){
            if (w.count == most) {
                if (i < min) {
                    min = i;
                }
                if (i > max) {
                    max = i;
                }
            }
        });
        if (min == max) return tpos[min].price;
        var target = decimal((tpos[min].price + tpos[max].price) / 2);
        var poc = _.range(min+1, max+1).reduce(function(price, i) {
            if (Math.abs(tpos[i].price - target) < Math.abs(price - target))
                return tpos[i].price;
            return price;
        }, tpos[min].price);
        return Math.round(poc * 100) / 100;
    }

    function getTPOCount(points) {
        var prices = points.reduce(function(prices, point){
            var l = _.sortedIndex(prices, point.low);
            if (point.low != prices[l]) prices.splice(l, 0, point.low);
            var h = _.sortedIndex(prices, point.high);
            if (point.high != prices[h]) prices.splice(h, 0, point.high);
            return prices;
        }, []);
        var tpos = points.reduce(function(tpos, point){
            var low = _.sortedIndex(prices, point.low);
            var high = _.sortedIndex(prices, point.high);
            for (var i=low; i<=high && i<tpos.length; i++) {
                tpos[i].count++;
                if (i>low) tpos[i].lower++;
            }
            return tpos;
        }, prices.map(function(price){
            return {price: price, count: 0, lower: 0};
        }));
        var median = prices[Math.floor(prices.length/2)];
        var bottom = 0, top = tpos.length-1;
        while (tpos[bottom].price < 0) bottom++;
        while (tpos[top].price > median * 100) top--;
        if (tpos[bottom]) tpos[bottom].lower = 0;
        if (bottom >= top) return tpos;
        else return tpos.slice(bottom, top+1);
    }

    function getCalculation(ex, interval, field, args, slice) {
        if (!field) throw Error("Expected field or expression, but was: " + field);
        var shifted = slice ? Array.prototype.slice.call(args, slice, args.length) : args;
        return calculations[field] ?
            calculations[field].apply(this, [ex, interval].concat(shifted)) :
            _.isFinite(field) ? calculations.finite(ex, interval, field) :
            _.isString(field) ? calculations.identity(ex, interval, field) :
            getCalculation(ex, interval, _.first(field), _.rest(field));
    }

    function getValues(size, calc, points) {
        var n = calc.getDataLength();
        var m = Math.min(size, points.length);
        return _.range(points.length - m, points.length).map(function(i){
            return calc.getValue(points.slice(Math.max(i - n + 1, 0), i + 1));
        }, null);
    }

    function getValue(calc, points) {
        var n = calc.getDataLength();
        return calc.getValue(points.slice(Math.max(points.length - n, 0), points.length));
    }

    function decimal(float) {
        return Math.round(float * 10000) / 10000;
    }

    function sum(values) {
        return _.reduce(values, function(memo, value){
            return memo + value;
        }, 0);
    }

    function isPositiveInteger(n) {
        return n > 0 && _.isNumber(n) && Math.round(n) == n;
    }
})(_);

// intervals.js
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

var intervals = (function(_, moment) {
    var m1 = {
        value: 'm1',
        storeName: 'm1',
        millis: 60 * 1000,
        floor: function(ex, dateTime, amount) {
            return moment(dateTime).tz(ex.tz).startOf('minute');
        },
        ceil: function(ex, dateTime) {
            var start = m1.floor(ex, dateTime);
            if (start.valueOf() < moment(dateTime).valueOf())
                return start.add(1, 'minutes');
            return start;
        },
        inc: function(ex, dateTime, amount) {
            if (amount < 0) throw Error("Amount must be >= 0");
            var start = m1.ceil(ex, dateTime);
            var wd = start.isoWeekday();
            if (wd > 5)
                return m1.inc(ex, start.add(8 - wd, 'days'), amount);
            var opens = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketOpensAt, ex.tz);
            var closes = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketClosesAt, ex.tz);
            if (start.isBefore(opens))
                return m1.inc(ex, opens, amount);
            if (start.isAfter(closes))
                return m1.inc(ex, opens.add(1, 'days'), amount);
            var minInDay = closes.diff(opens, 'minutes');
            var weeks = Math.floor(amount /5 /minInDay);
            if (weeks)
                return m1.inc(ex, start.add(weeks, 'weeks'), Math.round(amount - weeks *5 *minInDay));
            var untilClose = closes.diff(start, 'minutes');
            if (untilClose < amount)
                return m1.inc(ex, opens.add(1, 'days'), amount - untilClose);
            return start.add(amount, 'minutes');
        },
        dec: function(ex, dateTime, amount) {
            if (amount < 0) throw Error("Amount must be >= 0");
            var start = m1.floor(ex, dateTime);
            var wd = start.isoWeekday();
            if (wd > 5)
                return m1.dec(ex, start.subtract(wd - 5, 'days'), amount);
            var opens = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketOpensAt, ex.tz);
            var closes = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketClosesAt, ex.tz);
            if (start.isBefore(opens))
                return m1.dec(ex, closes.subtract(1, 'days'), amount);
            if (start.isAfter(closes))
                return m1.dec(ex, closes, amount);
            var minInDay = closes.diff(opens, 'minutes');
            var weeks = Math.floor(amount /5 /minInDay);
            if (weeks)
                return m1.dec(ex, start.subtract(weeks, 'weeks'), Math.round(amount - weeks *5 *minInDay));
            var sinceOpen = start.diff(opens, 'minutes');
            if (sinceOpen < amount)
                return m1.dec(ex, closes.subtract(1, 'days'), amount - sinceOpen);
            return start.subtract(amount, 'minutes');
        },
        diff: function(ex, to, from) {
            var start = m1.inc(ex, from, 0);
            var end = m1.dec(ex, to, 0);
            if (end.isBefore(start) && moment(to).isBefore(from))
                return -1 * m1.diff(ex, from, to);
            else if (end.isBefore(start))
                return 0;
            var opens = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketOpensAt, ex.tz);
            var closes = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketClosesAt, ex.tz);
            var minInDay = closes.diff(opens, 'minutes');
            var weeks = end.diff(start, 'weeks');
            if (weeks)
                return weeks * 5 * minInDay + m1.diff(ex, end, start.add(weeks, 'weeks'));
            var days = end.diff(start, 'days');
            if (days && start.isoWeekday() < end.isoWeekday())
                return days * minInDay + m1.diff(ex, end, start.add(days, 'days'));
            else if (end.isAfter(closes))
                return closes.diff(start, 'minutes') + m1.diff(ex, end, opens.add(1, 'days'));
            else return end.diff(start, 'minutes');
        }
    };
    var m5 = {
        derivedFrom: m1,
        value: 'm5',
        storeName: 'm5',
        aggregate: 5,
        millis: 5 * 60 * 1000,
        floor: function(ex, dateTime) {
            return moment.tz(Math.floor(moment(dateTime).valueOf() /5 /60 /1000) *5 *60 *1000, ex.tz);
        },
        ceil: function(ex, dateTime) {
            return moment.tz(Math.ceil(moment(dateTime).valueOf() /5 /60 /1000) *5 *60 *1000, ex.tz);
        },
        inc: function(ex, dateTime, amount) {
            return m1.inc(ex, m5.ceil(ex, dateTime), amount * 5);
        },
        dec: function(ex, dateTime, amount) {
            return m1.dec(ex, m5.floor(ex, dateTime), amount * 5);
        },
        diff: function(ex, to, from) {
            var minutes = m1.diff(ex, to, from);
            if (minutes < 0)
                return Math.ceil(minutes /5);
            return Math.floor(minutes /5);
        }
    };
    var m10 = {
        value: 'm10',
        storeName: 'm10',
        millis: 10 * 60 * 1000,
        floor: function(ex, dateTime) {
            return moment.tz(Math.floor(moment(dateTime).valueOf() /10 /60 /1000) *10 *60 *1000, ex.tz);
        },
        ceil: function(ex, dateTime) {
            return moment.tz(Math.ceil(moment(dateTime).valueOf() /10 /60 /1000) *10 *60 *1000, ex.tz);
        },
        inc: function(ex, dateTime, amount) {
            return m1.inc(ex, m10.ceil(ex, dateTime), amount * 10);
        },
        dec: function(ex, dateTime, amount) {
            return m1.dec(ex, m10.floor(ex, dateTime), amount * 10);
        },
        diff: function(ex, to, from) {
            var minutes = m1.diff(ex, to, from);
            if (minutes < 0)
                return Math.ceil(minutes /10);
            return Math.floor(minutes /10);
        }
    };
    var m30 = {
        derivedFrom: m10,
        value: 'm30',
        storeName: 'm30',
        aggregate: 3,
        millis: 30 * 60 * 1000,
        floor: function(ex, dateTime) {
            return moment.tz(Math.floor(moment(dateTime).valueOf() /30 /60 /1000) *30 *60 *1000, ex.tz);
        },
        ceil: function(ex, dateTime) {
            return moment.tz(Math.ceil(moment(dateTime).valueOf() /30 /60 /1000) *30 *60 *1000, ex.tz);
        },
        inc: function(ex, dateTime, amount) {
            return m1.inc(ex, m30.ceil(ex, dateTime), amount * 30);
        },
        dec: function(ex, dateTime, amount) {
            return m1.dec(ex, m30.floor(ex, dateTime), amount * 30);
        },
        diff: function(ex, to, from) {
            var minutes = m1.diff(ex, to, from);
            if (minutes < 0)
                return Math.ceil(minutes /30);
            return Math.floor(minutes /30);
        }
    };
    var m60 = {
        value: 'm60',
        storeName: 'm60',
        millis: 60 * 60 * 1000,
        floor: function(ex, dateTime) {
            return moment(dateTime).tz(ex.tz).startOf('hour');
        },
        ceil: function(ex, dateTime) {
            var start = m60.floor(ex, dateTime);
            if (start.valueOf() < moment(dateTime).valueOf())
                return start.add(1, 'hours');
            return start;
        },
        inc: function(ex, dateTime, amount) {
            if (amount < 0) throw Error("Amount must be >= 0");
            var date = moment(dateTime).tz(ex.tz);
            var opens = moment.tz(date.format('YYYY-MM-DD') + 'T' + ex.marketOpensAt, ex.tz);
            var start = opens.valueOf() == date.valueOf() ? date.startOf('hour') : m60.ceil(ex, dateTime);
            var wd = start.isoWeekday();
            if (wd > 5)
                return m60.inc(ex, start.add(8 - wd, 'days'), amount);
            var closes = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketClosesAt, ex.tz);
            if (start.hour() < opens.hour())
                return m60.inc(ex, opens, amount);
            if (start.hour() > closes.hour())
                return m60.inc(ex, opens.add(1, 'days'), amount);
            var hoursInDay = closes.hour() - opens.hour();
            var weeks = Math.floor(amount /5 /hoursInDay);
            if (weeks)
                return m60.inc(ex, start.add(weeks, 'weeks'), Math.round(amount - weeks *5 *hoursInDay));
            var untilClose = closes.hour() - start.hour();
            if (untilClose < amount)
                return m60.inc(ex, opens.add(1, 'days'), amount - untilClose);
            if (amount === 0 && opens.hour() == start.hour())
                return opens;
            return start.add(amount, 'hours');
        },
        dec: function(ex, dateTime, amount) {
            if (amount < 0) throw Error("Amount must be >= 0");
            var start = m60.floor(ex, dateTime);
            var wd = start.isoWeekday();
            if (wd > 5)
                return m60.dec(ex, start.subtract(wd - 5, 'days'), amount);
            var opens = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketOpensAt, ex.tz);
            var closes = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketClosesAt, ex.tz);
            if (start.hour() < opens.hour())
                return m60.dec(ex, closes.subtract(1, 'days'), amount);
            if (start.hour() > closes.hour())
                return m60.dec(ex, closes, amount);
            var hoursInDay = closes.hour() - opens.hour();
            var weeks = Math.floor(amount /5 /hoursInDay);
            if (weeks)
                return m60.dec(ex, start.subtract(weeks, 'weeks'), Math.round(amount - weeks *5 *hoursInDay));
            var sinceOpen = start.hour() - opens.hour();
            if (sinceOpen < amount)
                return m60.dec(ex, closes.subtract(1, 'days'), amount - sinceOpen);
            var result = start.subtract(amount, 'hours');
            if (opens.hour() == result.hour()) return opens;
            else return result;
        },
        diff: function(ex, to, from) {
            var start = m60.inc(ex, from, 0);
            var end = m60.dec(ex, to, 0);
            if (end.isBefore(start) && moment(to).isBefore(from))
                return -1 * m60.diff(ex, from, to);
            else if (end.isBefore(start))
                return 0;
            var opens = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketOpensAt, ex.tz);
            var closes = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketClosesAt, ex.tz);
            var hoursInDay = closes.hour() - opens.hour();
            var weeks = end.diff(start, 'weeks');
            if (weeks)
                return weeks * 5 * hoursInDay + m60.diff(ex, end, start.add(weeks, 'weeks'));
            var days = end.diff(start, 'days');
            if (days && start.isoWeekday() < end.isoWeekday())
                return days * hoursInDay + m60.diff(ex, end, start.add(days, 'days'));
            else if (end.isAfter(closes))
                return closes.hour() - start.hour() + m60.diff(ex, end, opens.add(1, 'days'));
            else return end.hour() - start.hour();
        }
    };
    var m120 = {
        derivedFrom: m60,
        value: 'm120',
        storeName: 'm120',
        aggregate: 2,
        millis: 120 * 60 * 1000,
        floor: function(ex, dateTime) {
            var start = m60.floor(ex, dateTime);
            if (start.hour() % 2) return start.subtract(1, 'hours');
            return start;
        },
        ceil: function(ex, dateTime) {
            var start = m60.ceil(ex, dateTime);
            if (start.hour() % 2) return start.add(1, 'hours');
            return start;
        },
        inc: function(ex, dateTime, amount) {
            if (amount < 0) throw Error("Amount must be >= 0");
            var date = moment(dateTime).tz(ex.tz);
            var opens = moment.tz(date.format('YYYY-MM-DD') + 'T' + ex.marketOpensAt, ex.tz);
            var floorOpens = m120.floor(ex, opens);
            var start = opens.valueOf() == date.valueOf() ? floorOpens : m120.ceil(ex, dateTime);
            var wd = start.isoWeekday();
            if (wd > 5)
                return m120.inc(ex, start.add(8 - wd, 'days'), amount);
            var closes = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketClosesAt, ex.tz);
            var ceilCloses = m120.ceil(ex, closes);
            if (start.valueOf() < floorOpens.valueOf())
                return m120.inc(ex, opens, amount);
            if (start.valueOf() > ceilCloses.valueOf())
                return m120.inc(ex, opens.add(1, 'days'), amount);
            var hoursInDay = (ceilCloses.hour() - floorOpens.hour()) /2;
            var weeks = Math.floor(amount /5 /hoursInDay);
            if (weeks)
                return m120.inc(ex, start.add(weeks, 'weeks'), Math.round(amount - weeks *5 *hoursInDay));
            var untilClose = (ceilCloses.hour() - start.hour()) /2;
            if (untilClose < amount)
                return m120.inc(ex, opens.add(1, 'days'), amount - untilClose);
            if (amount === 0 && floorOpens.valueOf() == start.valueOf())
                return opens;
            return start.add(amount*2, 'hours');
        },
        dec: function(ex, dateTime, amount) {
            if (amount < 0) throw Error("Amount must be >= 0");
            var start = m120.floor(ex, dateTime);
            var wd = start.isoWeekday();
            if (wd > 5)
                return m120.dec(ex, start.subtract(wd - 5, 'days'), amount);
            var opens = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketOpensAt, ex.tz);
            var floorOpens = m120.floor(ex, opens);
            var closes = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketClosesAt, ex.tz);
            var ceilCloses = m120.ceil(ex, closes);
            if (start.valueOf() < floorOpens.valueOf())
                return m120.dec(ex, closes.subtract(1, 'days'), amount);
            if (start.valueOf() > ceilCloses.valueOf())
                return m120.dec(ex, closes, amount);
            var hoursInDay = (ceilCloses.hour() - floorOpens.hour()) /2;
            var weeks = Math.floor(amount /5 /hoursInDay);
            if (weeks)
                return m120.dec(ex,start.subtract(weeks,'weeks'),Math.round(amount - weeks *5 *hoursInDay));
            var sinceOpen = (start.hour() - floorOpens.hour()) /2;
            if (sinceOpen < amount)
                return m120.dec(ex, closes.subtract(1, 'days'), amount - sinceOpen);
            var result = start.subtract(amount*2, 'hours');
            if (floorOpens.valueOf() == result.valueOf()) return opens;
            else return result;
        },
        diff: function(ex, to, from) {
            var start = m120.inc(ex, from, 0);
            var end = m120.dec(ex, to, 0);
            if (end.isBefore(start) && moment(to).isBefore(from))
                return -1 * m120.diff(ex, from, to);
            else if (end.isBefore(start))
                return 0;
            var opens = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketOpensAt, ex.tz);
            var floorOpens = m120.floor(ex, opens);
            var closes = moment.tz(start.format('YYYY-MM-DD') + 'T' + ex.marketClosesAt, ex.tz);
            var ceilCloses = m120.ceil(ex, closes);
            var hoursInDay = (ceilCloses.hour() - floorOpens.hour()) /2;
            var weeks = end.diff(start, 'weeks');
            if (weeks)
                return weeks * 5 * hoursInDay + m120.diff(ex, end, start.add(weeks, 'weeks'));
            var days = end.diff(start, 'days');
            if (days && start.isoWeekday() < end.isoWeekday())
                return days * hoursInDay + m120.diff(ex, end, start.add(days, 'days'));
            else if (end.isAfter(ceilCloses))
                return Math.ceil((ceilCloses.hour() - start.hour()) /2) + m120.diff(ex, end, opens.add(1, 'days'));
            else return Math.ceil((end.hour() - start.hour()) /2);
        }
    };
    var d1 = {
        value: 'd1',
        storeName: 'd1',
        millis: 24 * 60 * 60 * 1000,
        floor: function(ex, dateTime) {
            return moment(dateTime).tz(ex.tz).startOf('day');
        },
        ceil: function(ex, dateTime) {
            var start = d1.floor(ex, dateTime);
            if (start.valueOf() < moment(dateTime).valueOf())
                return start.add(1, 'days');
            return start;
        },
        inc: function(ex, dateTime, amount) {
            var start = d1.ceil(ex, dateTime);
            var wd = start.isoWeekday();
            if (wd > 5)
                return d1.inc(ex, start.add(8 - wd, 'days'), amount);
            var w = Math.floor((wd -1 + amount) / 5);
            var days = amount - w *5;
            if (wd + days < 6)
                return start.isoWeek(start.isoWeek() + w).isoWeekday(wd + days);
            else return start.isoWeek(start.isoWeek() + w).isoWeekday(wd +2 + days);
        },
        dec: function(ex, dateTime, amount) {
            var start = d1.floor(ex, dateTime);
            var wd = start.isoWeekday();
            if (wd == 1)
                return d1.dec(ex, start.subtract(2, 'days'), amount)
            else if (wd == 7)
                return d1.dec(ex, start.subtract(1, 'days'), amount);
            var w = Math.floor(amount / 5);
            var days = amount - w*5;
            if (wd > days)
                return start.isoWeek(start.isoWeek() - w).isoWeekday(wd - days);
            else return start.isoWeek(start.isoWeek() - w).isoWeekday(wd -2 - days);
        },
        diff: function(ex, to, from) {
            var start = moment(from).tz(ex.tz);
            var end = moment(to).tz(ex.tz);
            if (end.isBefore(start))
                return -1 * d1.diff(ex, from, to);
            var weeks = end.diff(start, 'weeks');
            if (weeks)
                return weeks * 5 + d1.diff(ex, end, start.add(weeks, 'weeks'));
            else if (start.isoWeekday() > 5)
                return d1.diff(ex, end, start.startOf('day').add(1, 'weeks').isoWeekday(1));
            else if (end.isoWeekday() > 6)
                return d1.diff(ex, end.startOf('day').isoWeekday(6), start);
            else if (start.isoWeekday() < end.isoWeekday())
                return end.diff(start, 'days');
            else
                return Math.max(end.diff(start, 'days') -2, 0);
        }
    };
    var d5 = {
        derivedFrom: d1,
        value: 'd5',
        storeName: 'd5',
        aggregate: 5,
        millis: 7 * 24 * 60 * 60 * 1000,
        floor: function(ex, dateTime) {
            return moment(dateTime).tz(ex.tz).startOf('isoweek');
        },
        ceil: function(ex, dateTime) {
            var start = moment(dateTime).tz(ex.tz).startOf('isoweek');
            if (start.valueOf() < moment(dateTime).valueOf())
                return start.isoWeek(start.isoWeek() + 1);
            return start;
        },
        inc: function(ex, dateTime, amount) {
            var start = d5.ceil(ex, dateTime);
            return start.isoWeek(start.isoWeek() + amount);
        },
        dec: function(ex, dateTime, amount) {
            var start = d5.floor(ex, dateTime);
            return start.isoWeek(start.isoWeek() + -amount);
        },
        diff: function(ex, to, from) {
            var start = moment(from).tz(ex.tz);
            var end = moment(to).tz(ex.tz);
            return end.diff(start, 'weeks');
        }
    };
    var quarter = {
        value: 'quarter',
        storeName: 'quarter',
        millis: 3 * 31 * 24 * 60 * 60 * 1000,
        floor: function(ex, dateTime) {
            return moment(dateTime).tz(ex.tz).startOf('quarter');
        },
        ceil: function(ex, dateTime) {
            var start = quarter.floor(ex, dateTime);
            if (start.valueOf() < moment(dateTime).valueOf())
                return start.add(3, 'months');
            return start;
        },
        inc: function(ex, dateTime, amount) {
            var start = quarter.ceil(ex, dateTime);
            return start.add(3 * amount, 'months');
        },
        dec: function(ex, dateTime, amount) {
            var start = quarter.floor(ex, dateTime);
            return start.subtract(3 * amount, 'months');
        },
        diff: function(ex, to, from) {
            var start = quarter.ceil(ex, from);
            var end = quarter.floor(ex, to);
            var months = end.diff(start, 'months');
            if (months < 0)
                return Math.ceil(months /3);
            return Math.floor(months /3);
        }
    };
    var annual = {
        value: 'annual',
        storeName: 'annual',
        millis: 365 * 24 * 60 * 60 * 1000,
        floor: function(ex, dateTime) {
            return moment(dateTime).tz(ex.tz).startOf('year');
        },
        ceil: function(ex, dateTime) {
            var start = annual.floor(ex, dateTime);
            if (start.valueOf() < moment(dateTime).valueOf())
                return start.add(1, 'years');
            return start;
        },
        inc: function(ex, dateTime, amount) {
            return moment(dateTime).tz(ex.tz).add(amount, 'years');
        },
        dec: function(ex, dateTime, amount) {
            return moment(dateTime).tz(ex.tz).subtract(amount, 'years');
        },
        diff: function(ex, to, from) {
            var start = moment(from).tz(ex.tz);
            var end = moment(to).tz(ex.tz);
            return end.diff(start, 'years');
        }
    };
    return {
        m1: m1,
        m5: m5,
        m10: m10,
        m30: m30,
        m60: m60,
        m120: m120,
        d1: d1,
        d5: d5,
        quarter: quarter,
        annual: annual
    };
})(_, moment);

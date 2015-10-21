// validate.js
/* 
 *  Copyright (c) 2015 James Leigh, Some Rights Reserved
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

function isArrayOf(func) {
    return function(object, path) {
        if (!_.isArray(object)) return false;
        if (!object.length) return false;
        for (var i=0; i<object.length; i++) {
            var ret = func(object[i], path);
            if (ret !== true) return ret;
        }
        return true;
    };
}

function isCriteria(object, path) {
    return validate(object, path, _.isObject) &&
        validate(object, path, optional(isIndicator), 'indicator') &&
        validate(object, path, optional(isIndicator), 'difference') &&
        validate(object, path, optional(isIndicator), 'percent') &&
        validate(object, path, optional(isIndicator), 'indicatorWatch') &&
        validate(object, path, optional(isIndicator), 'differenceWatch') &&
        validate(object, path, optional(isIndicator), 'percentWatch') &&
        validate(object, path, optional(_.isNumber, _.isString), 'upper') &&
        validate(object, path, optional(_.isNumber, _.isString), 'lower') &&
        validate(object.indicator || object.indicatorWatch, path + '.indicator', _.isObject);
}

function isScreen(object, path) {
    return validate(object, path, _.isObject) &&
        validate(object, path, isArrayOf(isFilter), 'watch') &&
        validate(object, path, _.isUndefined, 'monitor') &&
        validate(object, path, _.isUndefined, 'stop') &&
        validate(object, path, optional(isArrayOf(isFilter)), 'hold');
}

function isFilter(object, path) {
    return validate(object, path, _.isObject) &&
        validate(object, path, isIndicator, 'indicator') &&
        validate(object, path, optional(isIndicator), 'difference') &&
        validate(object, path, optional(isIndicator), 'percent') &&
        validate(object, path, optional(isIndicator), 'differenceWatch') &&
        validate(object, path, optional(isIndicator), 'percentWatch') &&
        validate(object, path, optional(_.isNumber, _.isString), 'upper') &&
        validate(object, path, optional(_.isNumber, _.isString), 'lower');
}

function isIndicator(object, path) {
    return validate(object, path, _.isObject) &&
        validate(object, path, _.isString, 'expression') &&
        validate(object, path, isInterval, 'interval');
}

function isInterval(object, path) {
    return validate(object, path, _.isObject) &&
        validate(object, path, function(value){
            return _.contains(['m1','m5','m10','m30','m60','m120','d1','d5','quarter','annual'], value);
        }, 'value');
}

function isSecurityClass(object, path) {
    return validate(object, path, _.isObject) &&
        validate(object, path, isExchange, 'exchange') &&
        validate(object, path, optional(isSecurity), 'correlated') &&
        validate(object, path, isArrayOf(_.isString), 'includes') &&
        validate(object, path, isArrayOf(function(iri){
            return iri.indexOf(object.exchange.iri) == 0 ||
                "must start with " + object.exchange.iri + " not " + iri;
        }), 'includes');
}

function isSecurity(object, path) {
    return validate(object, path, _.isObject) &&
        validate(object, path, _.isString, 'iri') &&
        validate(object, path, _.isString, 'ticker') &&
        validate(object, path, isExchange, 'exchange');
}

function isExchange(object, path) {
    return validate(object, path, _.isObject) &&
        validate(object, path, _.isString, 'iri') &&
        validate(object, path, _.isString, 'tz') &&
        validate(object, path, _.isString, 'mic') &&
        validate(object, path, isTime, 'marketOpensAt') &&
        validate(object, path, isTime, 'marketClosesAt') &&
        validate(object, path, isTime, 'premarketOpensAt') &&
        validate(object, path, isTime, 'afterHoursClosesAt') &&
        validate(object, path, optional(_.isString), 'yahooSuffix') &&
        validate(object, path, optional(_.isString), 'dtnPrefix') &&
        validate(object, path, _.isString, 'marketLang') &&
        validate(object, path, _.isString, 'exch') &&
        validate(object, path, _.isString, 'morningstarCode');
}

function isISOString(object, path) {
    return validate(object, path, _.isString) &&
        object.match(/^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+Z$/) &&
        new Date(object).getFullYear() > 1900;
}

function isTime(object, path) {
    return validate(object, path, _.isString) &&
        object.match(/^[0-2]\d:[0-5]\d:[0-5]\d$/) && true;
}

function optional(/* func.. */) {
    return oneOf.apply(this, [_.isUndefined, _.isNull].concat(_.toArray(arguments)));
}

function oneOf(/* func.. */) {
    var functions = _.toArray(arguments);
    return function(object, path) {
        return functions.reduce(function(ret, func) {
            if (ret === true) return ret;
            else return func(object, path);
        }, false);
    };
}

function validate(object, path, func, property) {
    var flatten = _.compact(_.flatten([path, property]));
    var value = property ? object[property] : object;
    var ret = func(value, flatten);
    if (ret === true) return ret;
    var msg = _.isString(ret) ? ret : "NOT " + (func.name || 'valid') + ' ' + value;
    throw Error(flatten.join('.') + " " + msg);
}

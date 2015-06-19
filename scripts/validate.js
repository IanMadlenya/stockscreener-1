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
    return function(array, path) {
        if (!_.isArray(array)) return false;
        for (var i=0; i<array.length; i++) {
            var ret = func(array[i], path);
            if (ret !== true) return ret;
        }
        return true;
    };
}

function isScreen(screen, path) {
    return _.isObject(screen);
}

function isSecurityClass(securityClass, path) {
    return validate(securityClass, path, _.isObject) &&
        validate(securityClass, path, isExchange, 'exchange') &&
        validate(securityClass, path, _.isArray, 'includes') &&
        validate(securityClass.includes, [path, 'includes'], isArrayOf(_.isString)) &&
        validate(securityClass.includes, [path, 'includes'], isArrayOf(function(iri){
            return iri.indexOf(securityClass.exchange.iri) == 0 ||
                "must start with " + securityClass.exchange.iri + " not " + iri;
        }));
}

function isExchange(exchange, path) {
    return validate(exchange, path, _.isObject) &&
        validate(exchange, path, _.isString, 'iri') &&
        validate(exchange, path, _.isString, 'tz') &&
        validate(exchange, path, _.isString, 'mic') &&
        validate(exchange, path, _.isString, 'marketOpensAt') &&
        validate(exchange, path, _.isString, 'marketClosesAt') &&
        //validate(exchange, path, _.isString, 'yahooSuffix') &&
        //validate(exchange, path, _.isString, 'dtnPrefix') &&
        validate(exchange, path, _.isString, 'marketLang') &&
        validate(exchange, path, _.isString, 'exch') &&
        validate(exchange, path, _.isString, 'morningstarCode');
}

function validate(object, path, func, property) {
    var flatten = _.compact(_.flatten([path, property]));
    var ret = func(property ? object[property] : object, flatten);
    if (ret === true) return ret;
    var msg = _.isString(ret) ? ret : "NOT " + (func.name || 'valid');
    throw Error(flatten.join('.') + " " + msg);
}

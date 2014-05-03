// background.js
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

(function(){
    window.addEventListener('load', (function(chrome){
        var workers = createWorkers();
        chrome.runtime.onSuspend.addListener(closeAllWorkers.bind(this, workers));
        chrome.runtime.onSuspendCanceled.addListener(function(){
            workers = createWorkers();
        });
        var iframe = appendIframe(chrome.runtime.getManifest().homepage_url, document);
        window.addEventListener('message', function(){
            sayHello(workers, iframe);
        });
    }).bind(this, chrome));

    function createWorkers() {
        return [
            new Worker('yahoo-quote.js'),
            new Worker('morningstar-financials.js'),
            new Worker('tmx-list.js'),
            new Worker('nasdaq-list.js')
        ];
    }

    function appendIframe(homepage_url, document) {
        var events_url = new URL("/screener/2014/purls/app-events", homepage_url);
        var iframe = document.createElement('iframe');
        iframe.setAttribute("src", events_url);
        document.body.appendChild(iframe);
        return iframe;
    }

    function sayHello(workers, iframe) {
        return Promise.all(workers.map(function(worker){
            return new Promise(function(resolve, reject){
                var channel = new MessageChannel();
                channel.port2.addEventListener('message', function(event){
                    iframe.contentWindow.postMessage(event.data, '*', event.ports);
                    resolve(worker);
                }, false);
                channel.port2.start();
                worker.postMessage("hello", [channel.port1]);
            });
        }));
    }

    function closeAllWorkers(workers) {
        workers.forEach(function(worker) {
            worker.postMessage("close");
        });
    }
})();


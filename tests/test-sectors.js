// test-screener.js
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

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60;

describe("Sectors", function(){
    these("list should return", [
        [["XNCM", "XNMS", "XNGS", "XASE", "XNYS"], ["Basic Industries", "Capital Goods", "Consumer Durables", "Consumer Non-Durables", "Consumer Services", "Energy", "Finance", "Health Care", "Miscellaneous", "Public Utilities", "Technology", "Transportation"]]
    ], checkSectorListing);

    these("NASDAQ market cap should include", [
        ["XNGS", "Technology", 200000000000, Infinity, "AAPL"],
        ["XNGS", "Technology",  30000000000, 200000000000, "ADBE"]
    ], checkCompanyMarketCap);

    these("NASDAQ should include", [
        ["XNCM", "Basic Industries", "RTK"],
        ["XNCM", "Capital Goods", "USCR"],
        ["XNCM", "Consumer Durables", "HDSN"],
        ["XNCM", "Consumer Non-Durables", "POPE"],
        ["XNCM", "Consumer Services", "ENT"],
        ["XNCM", "Energy", "AETI"],
        ["XNCM", "Finance", "GGAL"],
        ["XNCM", "Health Care", "KERX"],
        ["XNCM", "Miscellaneous", "PCOM"],
        ["XNCM", "Public Utilities", "FRP"],
        ["XNCM", "Technology", "SAAS"],
        ["XNCM", "Transportation", "AIRT"],
        ["XNMS", "Basic Industries", "MBII"],
        ["XNMS", "Capital Goods", "PGTI"],
        ["XNMS", "Consumer Durables", "FOMX"],
        ["XNMS", "Consumer Non-Durables", "LWAY"],
        ["XNMS", "Consumer Services", "HMTV"],
        ["XNMS", "Energy", "WLB"],
        ["XNMS", "Finance", "NGHC"],
        ["XNMS", "Health Care", "MNKD"],
        ["XNMS", "Miscellaneous", "CNSI"],
        ["XNMS", "Public Utilities", "CLFD"],
        ["XNMS", "Technology", "PFPT"],
        ["XNMS", "Transportation", "PTSI"],
        ["XNGS", "Basic Industries", "GOLD"],
        ["XNGS", "Capital Goods", "PCAR"],
        ["XNGS", "Consumer Durables", "SIAL"],
        ["XNGS", "Consumer Non-Durables", "MDLZ"],
        ["XNGS", "Consumer Services", "AMZN"],
        ["XNGS", "Energy", "APA"],
        ["XNGS", "Finance", "CME"],
        ["XNGS", "Health Care", "GILD"],
        ["XNGS", "Miscellaneous", "EBAY"],
        ["XNGS", "Public Utilities", "VZ"],
        ["XNGS", "Technology", "AAPL"],
        ["XNGS", "Transportation", "AAL"],
        ["XASE", "Basic Industries", "SIM"],
        ["XASE", "Capital Goods", "GRC"],
        ["XASE", "Consumer Durables", "CCF"],
        ["XASE", "Consumer Non-Durables", "DLA"],
        ["XASE", "Consumer Services", "SGA"],
        ["XASE", "Energy", "IMO"],
        ["XASE", "Finance", "PRK"],
        ["XASE", "Health Care", "TXMD"],
        ["XASE", "Miscellaneous", "VHC"],
        ["XASE", "Public Utilities", "LNG"],
        ["XASE", "Technology", "VISI"],
        ["XASE", "Transportation", "RLGT"],
        ["XNYS", "Basic Industries", "PG"],
        ["XNYS", "Capital Goods", "BA"],
        ["XNYS", "Consumer Durables", "ABB"],
        ["XNYS", "Consumer Non-Durables", "KO"],
        ["XNYS", "Consumer Services", "WMT"],
        ["XNYS", "Energy", "XOM"],
        ["XNYS", "Finance", "WFC"],
        ["XNYS", "Health Care", "JNJ"],
        ["XNYS", "Miscellaneous", "CAJ"],
        ["XNYS", "Public Utilities", "VZ"],
        ["XNYS", "Technology", "IBM"],
        ["XNYS", "Transportation", "UNP"]
    ], checkCompanyListing);
});

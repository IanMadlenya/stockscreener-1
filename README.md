Probability Stock Screener
==========================

Thank you for your interest in Probability Stock Screener. This Chrome App can be installed into a Google Chrome Web browser. It is used by the probability Stock Screener Web application to retrieve data feeds of stocks and other securities on supported exchanges.

The Probability Stock Screener Web application is a tool investors and traders use to filter securities that fit a certain set of criteria. For example, users are able to screen for stocks by data including price, market capitalization, P/E ratio, dividend yield and 52-week price change percentage, average volume and average five-year return on investment (ROI). This screener also allow users to screen using technical indicator data. For example, one could filter for stocks that are trading above their 200-day moving average or whose Relative Strength Index (RSI) values are between a specified range.

Active traders can use this screener to test probalility of set-ups for short and long-term results. Users can enter a varying number of filters; as more filters are applied, fewer stocks will be displayed on the screen. This screener allows investors and traders to analyze hundreds of stocks in a short period of time, making it possible to weed out those stocks that don't meet the user's requirements and to compare the performance of systems using historic data.

## License

The source code of this app is licensed under the BSD, a copy is provided in the [LICENSE.txt](LICENSE.txt) file. However, the use of this software and the data it provides is only licensed for noncommercial use under the terms in the [End User License Agreement](EULA.md) file.

## Prerequisites

1. You must have a recent version of Google Chrome Web browser installed. [Google Chrome can be download here](http://www.google.com/chrome/).
2. You must have an active Google User Account. [A Google User Account can be created here](https://accounts.google.com/SignUp).
3. You must have an active Yahoo! User Account. [A Yahoo! User Account can be created here](https://login.yahoo.com/).
4. You must have some basic knowledge of stock trading. [Read about Stock Basics here](http://www.investopedia.com/university/stocks/).

## Installation

### Install from Source Code

> You will need to have a git client installed, such as [GitHub for Windows](https://windows.github.com/).

> You will need to install and run the [Callimachus Web Server](http://callimachusproject.org/), version 1.4.

The Probability Stock Screener source code is spread across two git repository:
* *stockscreener* contains the Chrome App data feed
* *screener* contains the Web application interface

1. Clone the git repository https://github.com/ptrading/screener.git from [github](https://github.com/ptrading/screener).
2. Using an ZIP utility create a ZIP file of the contents of the repository (excluding .git), or [download it here](https://github.com/ptrading/screener/archive/master.zip).
3. From the Callimachus [home folder](http://localhost:8080/?view) select "Import folder contents" from the main menu.
4. Choose the ZIP file from step 2 and import into a sub folder, such as "screener".
5. Clone the git repository https://github.com/ptrading/stockscreener.git from [github](https://github.com/ptrading/stockscreener).
6. Modify the launch.uri file to contain the correct launch URL to the imported Callimachus Web application.
7. Open the Extension tab in a Google Chrome Web Browser
8. Enabled developer mode (checkbox in upper right corner of extension page).
9. Click on Load unpackaed extension...
10. Select the location of the locally cloned git repository stockscreener
11. Read the End User License Agreement for Probability Stock Screener
12. Either accept terms or remove the Chrome App from the extensions page
13. If you accepted terms, launch the Chrome App to get started

## Contribution

### New Feature Requests

To request a new feature, such as another exchange or a new indicator, please [Create a new Issue](https://github.com/ptrading/screener/issues/new). If the feature require is specifically to support a new data feed [create e Data feed Issue](https://github.com/ptrading/stockscreener/issues/new).

### Source Code Changes

If you have already modified your source code and would like to have your changes included in a future release, please create a Pull Request for the corresponding repository..

### Testing

If you have modified the source code and want to check that the required functionality is still functioning, with the Chrome App enabled and running, you can open a browser to [/tests/index.html](http://localhost:1880/tests/index.html) to have access to some of the included test scripts.



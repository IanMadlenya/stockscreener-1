// options.js

document.addEventListener("DOMContentLoaded", function(){
    var inputs = [].slice.call(document.getElementsByTagName("input"));
    chrome.storage.local.get(inputs.reduce(function(names, input){
        names.push(input.name);
        return names;
    }, []), function(items) {
        inputs.forEach(function(input){
            if (items[input.name]) input.value = items[input.name];
        });
    });
    document.getElementById("form").addEventListener("submit", function(event) {
        event.preventDefault();
        var items = inputs.reduce(function(items, input){
            items[input.name] = input.value;
            return items;
        }, {});
        chrome.storage.local.set(items);
    });
});

// eula.js

document.addEventListener("DOMContentLoaded", function(){
    var xhr = new XMLHttpRequest();
    xhr.onloadend = function() {
        document.getElementById("content").innerHTML = marked(xhr.responseText);
    };
    xhr.open('GET', "../EULA.md", true);
    xhr.send();
});

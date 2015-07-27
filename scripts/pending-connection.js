// pending-connection.js

document.addEventListener("DOMContentLoaded", function(){
    document.getElementById("address").textContent = window.location.hash.substring(1);
    document.getElementById("accept").addEventListener("click", function(event){
        document.getElementById("peerAddress").value += " " + window.location.hash.substring(1);
        document.getElementById("submit").click();
    });
});

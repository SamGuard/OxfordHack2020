if (location.protocol !== 'https:' && false) { //used to redirect users from http to https
    location.replace(`https:${location.href.substring(location.protocol.length)}`);
}
if (window.location.pathname != "" && window.location.pathname != "/") {
    window.location.href = "/";
}
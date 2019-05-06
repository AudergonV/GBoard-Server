var crypto = require('crypto');

var genRandomString = function(length){
    return crypto.randomBytes(Math.ceil(length/2))
            .toString('hex')
            .slice(0,length);   
};

var _sha512 = function(password, salt){
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt:salt,
        secret:value
    };
};

function saltHashPassword(password) {
    var salt = genRandomString(16);
    return _sha512(password, salt);
};

function verifyPassword(password, hash, salt, callback){
    callback(_sha512(password,salt).secret === hash);
};

module.exports = { saltHashPassword, verifyPassword, genRandomString };
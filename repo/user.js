const { db } = require("../configs/db")


function isPremierUser(username) {
    const user = db.get('users').find({user: username}).value();
    if(user == undefined) {
        return false;
    }

    return user.premier == undefined ? false : user.premier;
}

function getSession() {
    return db.get('session').value();
}

function getUserByUsername(username) {
    return db.get("users").find({ user: username }).value();
}

module.exports = {
    isPremierUser,
    getSession,
    getUserByUsername
}
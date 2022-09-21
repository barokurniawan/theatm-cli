const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync(`${__dirname}/../db.json`);
const db = low(adapter);

db.defaults({
    users: [
        { user: "john" },
        { user: "doe" },
    ],
    balance: [],
    owes: [],
    session: null,
}).write();

module.exports = {
    db
};
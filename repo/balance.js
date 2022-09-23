const { db } = require("../configs/db");

function owedNotes(user, targetUser, amount) {
    let owe = db.get('owes').find({ user: targetUser }).value();
    if (owe == undefined) {
        db.get('owes').push({ user: targetUser, owes: null, owed: null }).write();
        owe = db.get('owes').find({ user: targetUser }).value();
    }

    let item = owe.owed == null ? {} : owe.owed;
    // check if user already has an owe to target user 
    if (item[user]) {
        item[user] = parseFloat(owe.owed[user]) + Math.abs(amount);
    } else {
        item[user] = (amount * -1);
    }

    db.get('owes').find({ user: targetUser }).assign({
        owed: item
    }).write();
}

function generateOwesNotes(user, targetUser, amount) {
    let owe = db.get('owes').find({ user: user }).value();
    if (owe == undefined) {
        db.get('owes').push({ user: user, owes: null, owed: null }).write();
        owe = db.get('owes').find({ user: user }).value();
    }

    // check if user already has an owe to target user
    let item = owe.owes == null ? {} : owe.owes;
    if (item[targetUser]) {
        item[targetUser] = parseFloat(owe.owes[targetUser]) + Math.abs(amount);
    } else {
        item[targetUser] = Math.abs(amount);
    }

    db.get('owes').find({ user: user }).assign({
        owes: item
    }).write();

    owedNotes(user, targetUser, amount);
}

function paidOwedNotes(user, targetUser, amount) {
    let owe = db.get('owes').find({ user: targetUser }).value();
    if (owe == undefined) {
        db.get('owes').push({ user: targetUser, owes: null, owed: null }).write();
        owe = db.get('owes').find({ user: targetUser }).value();
    }

    // check if user already has an owe to target user
    let item = owe.owed == null ? {} : owe.owed;
    if (item[user]) {
        item[user] = parseFloat(owe.owed[user]) - Math.abs(amount);
    }

    db.get('owes').find({ user: targetUser }).assign({
        owed: item
    }).write();
}

function generatePaidOwesNotes(user, targetUser, amount) {
    let owe = db.get('owes').find({ user: user }).value();
    if (owe == undefined) {
        db.get('owes').push({ user: user, owes: null, owed: null }).write();
        owe = db.get('owes').find({ user: user }).value();
    }

    // check if user already has an owe to target user 
    let item = owe.owes == null ? {} : owe.owes;
    if (item[targetUser]) {
        item[targetUser] = parseFloat(owe.owes[targetUser]) - Math.abs(amount);
    }

    db.get('owes').find({ user: user }).assign({
        owes: item
    }).write();

    paidOwedNotes(user, targetUser, amount);
}

function showBalanceStatus(user) {
    setTimeout(() => {
        const owes = db.get("owes").find({ user: user }).value();
        const balanceAmount = getUserBalanceAmount(user);
    
        let message = `Your balance is ${balanceAmount}`;
        if (owes && owes.owes != null) {
            let items = Object.entries(owes.owes);
            for (const i in items) {
                const key = items[i][0];
                const value = items[i][1];
                if(value == 0) continue;
    
                message += `\r\n-> Owed ${value} to ${key}`;
            }
        }
    
        if (owes && owes.owed != null) {
            let items = Object.entries(owes.owed);
            for (const i in items) {
                const key = items[i][0];
                const value = items[i][1];
                if(value == 0) continue;
    
                message += `\r\n-> Owed ${value} from ${key}`;
            }
        }
    
        console.log(message);
    }, 500);
}

function addition(userAccount, amount) {
    let currentBalance = getUserBalanceAmount(userAccount);
    currentBalance = parseFloat(currentBalance) + amount;

    db.get('balance').find({ user: userAccount }).assign({
        amount: currentBalance
    }).write();
}

function deduction(userAccount, amount, isTransfer, targetUser) {
    let currentBalance = getUserBalanceAmount(userAccount);
    const currentAmount = currentBalance;
    currentBalance = parseFloat(currentBalance) - amount;
    if (!isTransfer && currentBalance < 0) {
        throw `insufficient balance\r\nYour balance is ${currentAmount}`;
    }

    if (isTransfer && currentBalance < 0) {
        const session = db.get("session").value();
        generateOwesNotes(session.user, targetUser, currentBalance);
    }

    db.get('balance').find({ user: userAccount }).assign({
        amount: currentBalance < 0 ? 0 : currentBalance
    }).write();
}

function getUserBalanceAmount(user) {
    let userBalance = 0;
    let balance = db.get('balance').find({ user: user }).value();
    if (balance == undefined) {
        db.get('balance').push({
            user: user,
            amount: 0
        }).write();

        balance = db.get('balance').find({ user: user }).value();
    }

    userBalance = parseFloat(balance.amount);
    if (Number.isNaN(userBalance)) {
        userBalance = 0;
    }

    return userBalance;
}

module.exports = {
    generateOwesNotes,
    showBalanceStatus,
    addition,
    deduction,
    getUserBalanceAmount,
    generatePaidOwesNotes,
}
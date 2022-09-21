const { db } = require("../configs/db");
const balanceRepo = require("../repo/balance");

function amountManipulation(userAccount, balanceAmount, type, isTransfer = false, targetUser = "") {
    if (!balanceAmount) {
        console.error(`balance is required`);
        return false;
    }

    const amount = parseFloat(balanceAmount);
    if (Number.isNaN(amount)) {
        console.error(`invalid balance`);
        return false;
    }

    try {
        switch (type) {
            case "addition":
                balanceRepo.addition(userAccount, amount);
                break;

            case "deduction":
                balanceRepo.deduction(userAccount, amount, isTransfer, targetUser);
                break;

            default:
                throw `Invalid type operation!`;
                break;
        }
    } catch (error) {
        console.error(error);
        return false;
    }

    return true;
}

function onDeposit(arg) {
    const session = db.get('session').value();
    if (session == undefined) {
        console.error("You are not logged in");
        return;
    }

    const ok = amountManipulation(session.user, arg.args[0], "addition");
    if (ok) {
        // check if user has owe to other user 
        const owe = db.get("owes").find({ user: session.user }).value();
        if (owe != undefined && owe.owes != null) {
            const items = Object.entries(owe.owes);
            for (const i in items) {
                const othUser = items[i][0];
                const amount = items[i][1];

                // user has an owe to other user
                // execute transfer function to transfer 
                onTransfer({
                    args: [othUser, amount]
                });
            }
        }


        balanceRepo.showBalanceStatus(session.user);
    }
}

function onWithdraw(arg) {
    const session = db.get('session').value();
    if (session == undefined) {
        console.error("You are not logged in");
        return;
    }

    const ok = amountManipulation(session.user, arg.args[0], "deduction");
    if (ok) {
        balanceRepo.showBalanceStatus(session.user);
    }
}

function onLogout() {
    const session = db.get('session').value();
    if (session == undefined) {
        console.error(`You are not logged in`);
        return;
    }

    console.log(`Goodbye, ${session.user}!`);
    db.set('session', null).write();
}

function onLogin(arg) {
    if (!arg.args[0]) {
        console.error(`username is required`);
        return;
    }

    const username = arg.args[0];
    let logedUser = db.get("users").find({ user: username }).value();
    if (logedUser == undefined) {
        console.log("Registering user..");
        db.get('users').push({ user: username }).write();

        logedUser = db.get("users").find({ user: username }).value();
    }

    db.set("session", { user: logedUser.user }).write();
    console.log(`Hello, ${logedUser.user}`);
    balanceRepo.showBalanceStatus(username);
}

function onTransfer(arg) {
    if (arg.args == undefined || arg.args.length == 0) {
        console.error(`Invalid arguments`, arg.args);
        return;
    }

    const targetUser = arg.args[0];
    const transferAmount = parseFloat(arg.args[1]);

    const session = db.get('session').value();
    if (session == undefined) {
        console.error(`You are not logged in`);
        return;
    }

    if (Number.isNaN(transferAmount) || transferAmount <= 0) {
        console.error(`Invalid transfer amount`);
        return;
    }

    const chkTargetUser = db.get("users").find({ user: targetUser }).value();
    if (chkTargetUser == undefined) {
        console.error(`account not found`);
        return;
    }

    if (chkTargetUser.user == session.user) {
        console.error(`Invalid target account`);
        return;
    }

    const currentBalance = balanceRepo.getUserBalanceAmount(session.user);
    const amountTf = ((currentBalance - transferAmount) < 0) ? Math.abs(transferAmount - (transferAmount - currentBalance)) : transferAmount;
    let ok = amountManipulation(session.user, transferAmount, "deduction", true, chkTargetUser.user);
    if (!ok) {
        console.error(`deduction failed`);
        return;
    }

    ok = amountManipulation(chkTargetUser.user, amountTf, "addition", true);
    if (!ok) {
        console.error(`transfer failed`);
        return;
    }

    console.log(`Transferred ${amountTf} to ${chkTargetUser.user}`);
    balanceRepo.showBalanceStatus(session.user);
}

module.exports = {
    onDeposit,
    onWithdraw,
    onLogin,
    onLogout,
    onTransfer,
};
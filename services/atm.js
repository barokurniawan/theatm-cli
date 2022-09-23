const { default_fee } = require("../configs/atm");
const { db } = require("../configs/db");
const balanceRepo = require("../repo/balance");
const { getSession, getUserByUsername, isPremierUser } = require("../repo/user");

function amountManipulation(userAccount, balanceAmount, type, isTransfer = false, targetUser = "") {
    if (balanceAmount == undefined) {
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
                balanceRepo.addition(userAccount, amount, isTransfer);
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
    let showBalance = true;
    let session = db.get('session').value();
    if (session == undefined) {
        console.error("You are not logged in");
        return;
    }

    if(arg.user) {
        session = arg.user;
        showBalance = false;
    }

    const isTransfer = arg.isTransfer == undefined ? false : arg.isTransfer;
    const depositAmount = arg.args[0];
    let ok = amountManipulation(session.user, depositAmount, "addition", isTransfer);
    if (ok) {
        // check if user has owe to other user 
        const owe = db.get("owes").find({ user: session.user }).value();
        if (owe != undefined && owe.owes != null) {
            const items = Object.entries(owe.owes);
            for (const i in items) {
                const othUser = items[i][0];
                const oweAmount = items[i][1];

                if(oweAmount <= 0) {
                    continue;
                }

                const sisaDeposit = Math.abs(depositAmount - oweAmount);
                const amountTf = depositAmount > oweAmount ? (depositAmount - sisaDeposit) : (oweAmount - sisaDeposit);
                // user has an owe to other user
                // execute transfer function to transfer 
                ok = onTransfer({
                    user: session,
                    args: [othUser, amountTf]
                });

                if(ok) {
                    balanceRepo.generatePaidOwesNotes(
                        session.user,
                        othUser,
                        amountTf
                    );
                }
            }
        }

        if(showBalance) balanceRepo.showBalanceStatus(session.user);
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
    let showBalance = true;
    if (arg.args == undefined || arg.args.length == 0) {
        console.error(`Invalid arguments`, arg.args);
        return false;
    }

    const targetUser = arg.args[0];
    let transferAmount = parseFloat(arg.args[1]);

    let session = getSession();
    if (session == undefined) {
        console.error(`You are not logged in`);
        return false;
    }

    if(arg.user) {
        session = arg.user;
        showBalance = false;
    }

    if (Number.isNaN(transferAmount) || transferAmount <= 0) {
        console.error(`Invalid transfer amount`);
        console.error(`transferAmount: `, transferAmount);
        return false;
    }

    const chkTargetUser = getUserByUsername(targetUser);
    if (chkTargetUser == undefined) {
        console.error(`account not found`);
        return false;
    }

    if (chkTargetUser.user == session.user) {
        console.error(`Invalid target account`);
        return false;
    }

    const currentBalance = balanceRepo.getUserBalanceAmount(session.user);
    let amountTf = ((currentBalance - transferAmount) < 0) ? Math.abs(transferAmount - (transferAmount - currentBalance)) : transferAmount;
    let transferFee = default_fee;
    const mIsPremierUser = isPremierUser(session.user);
    if (mIsPremierUser) {
        transferFee = 0;
    }

    // jika saldo lebih besar dari admin+nominal transfer
    // maka biaya admin di tambahkan ke nominal transfer
    if(currentBalance > (transferFee + amountTf)) {
        transferAmount = transferFee + amountTf;
    }

    // jika total saldo sama dengan jumlah transfer 
    // maka biaya admin di potong dari nominal transfer
    if(currentBalance == amountTf) {
        transferAmount = transferAmount + transferFee;
        amountTf = amountTf - transferFee;
    }

    let ok = amountManipulation(session.user, transferAmount, "deduction", true, chkTargetUser.user);
    if (!ok) {
        console.error(`deduction failed`);
        return false;
    }

    console.log(`Transferred ${amountTf} to ${chkTargetUser.user}`);

    onDeposit({
        user: chkTargetUser,
        args: [amountTf],
        isTransfer: true
    });

    // ok = amountManipulation(chkTargetUser.user, amountTf, "addition", true);
    // if (!ok) {
    //     console.error(`transfer failed`);
    //     return false;
    // }

    if(showBalance) {
        balanceRepo.showBalanceStatus(session.user);
    }

    return true;
}

module.exports = {
    onDeposit,
    onWithdraw,
    onLogin,
    onLogout,
    onTransfer,
    amountManipulation
};
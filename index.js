#!/usr/bin/env node

const atm = require('./services/atm');

function parseArgv(argv) {
    let output = {};
    argv.forEach(function (item, i) {
        if (i < 2) return;
        if (!Array.isArray(output['args'])) {
            output['args'] = [];
        }

        switch (i) {
            case 2:
                output['command'] = item;
                break;

            default:
                output['args'].push(item);
                break;
        }
    });

    return output;
}

function handleArguments(arg) {
    switch (arg.command) {

        // * `login [name]` - Logs in as this customer and creates the customer if not exist
        case "login":
            atm.onLogin(arg);
            break;

        // * `deposit [amount]` - Deposits this amount to the logged in customer
        case "deposit":
            atm.onDeposit(arg);
            break;

        // * `withdraw [amount]` - Withdraws this amount from the logged in customer
        case "withdraw":
            atm.onWithdraw(arg);
            break;

        // * `transfer [target] [amount]` - Transfers this amount from the logged in customer to the target customer
        case "transfer":
            atm.onTransfer(arg);
            break;

        // * `logout` - Logs out of the current customer
        case "logout":
            atm.onLogout();
            break;

        default:
            console.error("Invalid Arguments");
            break;
    }
}

function main() {
    const arguments = parseArgv(process.argv);
    handleArguments(arguments);
}

main();
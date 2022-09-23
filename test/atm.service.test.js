const balanceRepo = require("../repo/balance");
const userRepo = require("../repo/user");
const atmService = require("../services/atm");
const fs = require('fs');
const { db } = require("../configs/db");

// test("user can transfer ", () => {
//     balanceRepo.getUserBalanceAmount = jest.fn().mockResolvedValue(20);
//     atmService.amountManipulation = jest.fn().mockResolvedValue(true);
//     console.log = jest.fn().mockResolvedValue('');

//     const ok = atmService.onTransfer({
//         args: ['john', 10]
//     });

//     expect(ok).toBe(true);
// });

test("user premier transfer without fee ", () => {
    console.log = jest.fn().mockResolvedValue('');
    const johnBalanceBefore = balanceRepo.getUserBalanceAmount("john");

    atmService.onLogin({
        args: ['asep']
    });

    atmService.onDeposit({
        args: [100]
    })

    const ok = atmService.onTransfer({
        args: ['john', 100]
    });

    expect(ok).toBe(true);

    const johnBalanceAfter = balanceRepo.getUserBalanceAmount("john");
    expect(johnBalanceAfter == (johnBalanceBefore + 100)).toBe(true);
});

test("user non-premier transfer with fee ", () => {
    console.log = jest.fn().mockResolvedValue('');
    const johnBalanceBefore = balanceRepo.getUserBalanceAmount("john");

    atmService.onLogin({
        args: ['doe']
    });

    atmService.onDeposit({
        args: [10]
    })

    const ok = atmService.onTransfer({
        args: ['john', 10]
    });

    expect(ok).toBe(true);

    /**
     * 9 karena saldo doe hanya 10 dan transfer ke john 10
     * jadi actual transfer ke john hanya 9 karena di potong admin
     * dan kebentuk hutang ke john sebesar 1 
     */
    const johnBalanceAfter = balanceRepo.getUserBalanceAmount("john");
    expect(johnBalanceAfter == (johnBalanceBefore + 9)).toBe(true);

    const owes = db.get('owes').find({user: "doe"}).value();
    expect(owes.owes['john'] != undefined).toBe(true);
    expect(owes.owes['john'] == 1).toBe(true);    
});

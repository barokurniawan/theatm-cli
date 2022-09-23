const { db } = require("../configs/db");
const { isPremierUser } = require("../repo/user");

test('check user is premier', () => {
    expect(isPremierUser("asep")).toBe(true);
});

test('check user is not premier', () => {
    expect(isPremierUser("john")).toBe(false);
});

test('can handle if premier flag undefined and return false', () => {
    expect(isPremierUser("doe")).toBe(false);
});

test('can handle if user undefined and return false', () => {
    expect(isPremierUser("bobob")).toBe(false);
});


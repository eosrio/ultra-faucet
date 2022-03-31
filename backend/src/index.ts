import {readFile} from "node:fs/promises";
import {ApiServer} from "./ApiServer.js";
import {FaucetService} from "./services/faucet.js";
import {AccountCreationService} from "./services/account-creation.js";
import {UltraBlockchain} from "./modules/ultra.js";

const packageJson = JSON.parse((await readFile('package.json')).toString());
console.log(`Ultra Testnet Tools ${packageJson.version} - made with ❤  by EOSRio`);

let config: GlobalConfig;
try {
    config = JSON.parse((await readFile('config.json')).toString()) as GlobalConfig;
    if (!config) {
        process.exit(1);
    }
} catch (e) {
    console.log('failed to parse config file');
    process.exit(1);
}

const ultra = new UltraBlockchain(config);

await ultra.init();

// await ultra.newNonEbaAccount(
//     "EOS5quAWMKHJaBjJDgW79fCygBoo8aSRY4HyzJUPc5BsfbMmEaCdU",
//     "EOS5quAWMKHJaBjJDgW79fCygBoo8aSRY4HyzJUPc5BsfbMmEaCdU",
//     "10.00000000 UOS",
//     false
// );

// try {
//     for (let i = 0; i < 5; i++) {
//         const randomAccount = generateUltraAccountName();
//         console.log(i, randomAccount);
//     }
// } catch (e) {
//     console.log(e);
// }

const server = new ApiServer(config);
server.decorate('ultra', ultra);
const faucet = new FaucetService(server, ultra);
await faucet.start();

const acs = new AccountCreationService(server, ultra);
await acs.start();

await server.init();

console.log(server.printRoutes());

console.log('✅ HTTP API ready');
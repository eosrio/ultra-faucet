import {Api, JsonRpc} from 'eosjs';
import {JsSignatureProvider} from "eosjs/dist/eosjs-jssig.js";
import fetch from 'cross-fetch';
import {Action} from "eosjs/dist/eosjs-serialize.js";
import {TransactResult} from "eosjs/dist/eosjs-api-interfaces.js";
import {PushTransactionArgs} from "eosjs/dist/eosjs-rpc-interfaces.js";

interface Endpoint {
    url: string;
    online?: boolean;
    error?: string;
    lastConnection?: number;
    latency: number;
    blockNum?: number;
}

async function delay(milliseconds: number) {
    return new Promise<void>(resolve => {
        setTimeout(() => {
            resolve();
        }, milliseconds);
    });
}

export class UltraBlockchain {
    endpoints: Endpoint[];
    rpc: JsonRpc
    private isMonitoring = false;
    private pendingCheck = false;
    private monitoringLoop?: NodeJS.Timer;
    private optimalEndpoint = '';
    private config: GlobalConfig;
    private textEncoder = new TextEncoder();
    private textDecoder = new TextDecoder();
    private api: Api;
    private readonly sigProvider: JsSignatureProvider;

    constructor(config: GlobalConfig) {
        this.config = config;
        this.sigProvider = new JsSignatureProvider([
            this.config.faucetKey
        ]);
        if (config.endpoints.length > 0) {
            this.endpoints = config.endpoints.map(value => {
                return {
                    url: value,
                    lastConnection: -1,
                    latency: -1,
                    online: false
                }
            });
            this.rpc = new JsonRpc(this.endpoints[0].url, {fetch});
            this.api = new Api({
                rpc: this.rpc,
                textDecoder: this.textDecoder,
                textEncoder: this.textEncoder,
                signatureProvider: this.sigProvider
            });
        } else {
            console.log('No JsonRPC Endpoint Defined!');
            process.exit(1);
        }
    }

    async init() {
        this.checkEndpoints().catch(console.log);
    }

    async transact(actions: Action[], submit: boolean = false): Promise<any> {
        try {
            const result = await this.api.transact({
                actions: actions
            }, {
                expireSeconds: 300,
                useLastIrreversible: true,
                broadcast: submit,
                sign: true
            }) as TransactResult | PushTransactionArgs;
            if (submit && "transaction_id" in result) {
                console.log(`Transaction Submitted: ${result.transaction_id}`);
            } else if ("signatures" in result) {
                console.log(`Transaction Signed Locally: ${result.signatures}`)
            }
            return result;
        } catch (e: any) {
            return {
                error: e.message
            }
        }
    }

    async newNonEbaAccount(ownerPubKey: string, activePubKey: string, maxPayment: string, submit: boolean): Promise<any> {
        const txResult = await this.transact([
            {
                account: 'eosio',
                name: 'newnonebact',
                authorization: [{
                    actor: this.config.faucetAccount,
                    permission: this.config.faucetPermission
                }],
                data: {
                    creator: this.config.faucetAccount,
                    owner: {
                        threshold: 1,
                        keys: [{key: ownerPubKey, weight: 1}],
                        accounts: [],
                        waits: []
                    },
                    active: {
                        threshold: 1,
                        keys: [{key: activePubKey, weight: 1}],
                        accounts: [],
                        waits: []
                    },
                    max_payment: maxPayment
                }
            }
        ], submit);
        if (txResult) {
            // type TransactResult
            if ("transaction_id" in txResult) {
                await delay(2000);
                let accounts = await this.fetchAccountsByKey(ownerPubKey);
                if (accounts.length === 0) {
                    console.log('no account found yet...');
                    await delay(2000);
                    accounts = await this.fetchAccountsByKey(ownerPubKey);
                }
                return {accounts, txId: txResult.transaction_id};
            } else {
                return txResult;
            }
        } else {
            return null;
        }
    }

    async checkEndpoints() {
        this.pendingCheck = true;
        for (const endpoint of this.endpoints) {
            const timeRef = Date.now();
            const jsonRpc = new JsonRpc(endpoint.url, {fetch});
            try {
                const info = await jsonRpc.get_info();
                endpoint.latency = Date.now() - timeRef;
                endpoint.online = true;
                endpoint.lastConnection = (new Date(info.head_block_time + "Z")).getTime();
                endpoint.blockNum = info.head_block_num;
                endpoint.error = '';
            } catch (e: any) {
                endpoint.online = false;
                endpoint.error = e.message;
            }
        }
        const optimalEndpoint = this.getOptimalEndpointUrl();
        if (optimalEndpoint) {
            if (optimalEndpoint !== this.optimalEndpoint) {
                this.optimalEndpoint = optimalEndpoint;
                this.rpc = new JsonRpc(this.optimalEndpoint, {fetch});
                console.log(`Optimal Endpoint changed to: ${this.optimalEndpoint}`);
            }
        }
        console.table(this.endpoints);
        this.pendingCheck = false;
        if (!this.isMonitoring) {
            this.startMonitoringEndpoints();
        }
    }

    getOptimalEndpointUrl(): string | undefined {
        if (this.endpoints.length > 0) {
            if (this.endpoints.length === 1) {
                return this.endpoints[0].url;
            } else {
                // TODO: improve sorting
                let latestHeadBlock = 0;
                this.endpoints.forEach(value => {
                    if (value.online && value.blockNum && value.blockNum > 0) {
                        if (value.blockNum > latestHeadBlock) {
                            latestHeadBlock = value.blockNum;
                        }
                    }
                });
                this.endpoints.forEach(value => {
                    if (value.blockNum) {
                        if (Math.abs(latestHeadBlock - value.blockNum) > 20) {
                            value.online = false;
                            value.error = `head is ${latestHeadBlock - value.blockNum} blocks behind`;
                        }
                    }
                });
                this.endpoints.sort((a, b) => {
                    if (!a.online && b.online) {
                        return 1;
                    }
                    if (!b.online && a.online) {
                        return -1;
                    }
                    if (a.latency < b.latency) {
                        return -1;
                    }
                    if (b.latency < a.latency) {
                        return 1;
                    }
                    return 0;
                });
                return this.endpoints[0].url;
            }
        }
    }

    private startMonitoringEndpoints() {
        this.monitoringLoop = setInterval(() => {
            if (!this.pendingCheck) {
                this.checkEndpoints().catch(console.log);
            }
        }, 60000);
        this.isMonitoring = true;
    }

    async fetchAccountsByKey(pubKey: string): Promise<string[]> {
        const data = await this.rpc.get_accounts_by_authorizers([], [pubKey]);
        if (data.accounts) {
            return data.accounts.map(accData => accData.account_name);
        } else {
            return [];
        }
    }

    async issueTokens(accountName: string) {
        if (accountName) {
            const results = this.transact([
                {
                    account: this.config.faucetManagerContract,
                    name: 'givetokens',
                    authorization: [{
                        actor: this.config.faucetAccount,
                        permission: this.config.faucetPermission
                    }],
                    data: {
                        faucet: this.config.faucetAccount,
                        to: accountName
                    }
                }
            ], false);
            console.log(results);
        }
    }
}
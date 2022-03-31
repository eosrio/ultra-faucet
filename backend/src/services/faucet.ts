import {ApiServer} from "../ApiServer.js";
import {UltraBlockchain} from "../modules/ultra.js";
import Redis from "ioredis";

export class FaucetService {

    server: ApiServer
    ultraApi: UltraBlockchain;
    minIssueInterval = (2 * 60 * 1000);
    private ioRedis: Redis;

    constructor(server: ApiServer, ultra: UltraBlockchain) {
        this.server = server;
        this.ultraApi = ultra;
        this.ioRedis = new Redis()
    }

    async start() {
        this.setupRoutes();
    }

    async checkAccountLimit(account: string): Promise<boolean> {
        try {
            const lastIssue = await this.ioRedis.get(account);
            if (lastIssue) {
                return (parseInt(lastIssue) + this.minIssueInterval) < Date.now();
            } else {
                return true;
            }
        } catch (e) {
            console.log(e);
            return true;
        }
    }

    private setupRoutes() {
        this.server.addRoute('post', '/issueTokens', async (request) => {
            const body = request.body as {
                account: string;
                captcha: string;
            };

            if (!body.captcha) {
                throw new Error('MISSING_CAPTCHA');
            }

            try {
                const accountData = await this.ultraApi.rpc.get_account(body.account);
                if (accountData) {
                    console.log(accountData);
                }
            } catch (e) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }

            const canIssue = await this.checkAccountLimit(body.account);
            if (canIssue) {

                // const captchaStatus = await this.server.validateCaptchaResponse(body.captcha);
                // if (!captchaStatus) {
                //     throw new Error('INVALID_CAPTCHA');
                // }

                // issue tokens
                await this.ioRedis.set(body.account, Date.now(), "PX", this.minIssueInterval);

                return {
                    tx: ''
                };
            } else {
                throw new Error('COOLDOWN_ACTIVE')
            }

            // return await this.ultraApi.issueTokens(body.account);
        });


        this.server.addRoute('get', '/checkCooldown/:account', async (request) => {
            const params = request.params as any;
            const canIssue = await this.checkAccountLimit(params.account);
            if (canIssue) {
                return {allowed: true}
            } else {
                const lastIssue = await this.ioRedis.get(params.account);
                if (lastIssue) {
                    return {
                        allowed: false,
                        wait_until: parseInt(lastIssue) + this.minIssueInterval
                    }
                } else {
                    return {allowed: true}
                }
            }
        });
    }
}
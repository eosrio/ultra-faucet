import {ApiServer} from "../ApiServer.js";
import {UltraBlockchain} from "../modules/ultra.js";
import {FastifyRequest} from "fastify";

export class AccountCreationService {

    server: ApiServer;
    private ultraApi: UltraBlockchain;

    constructor(_server: ApiServer, ultra: UltraBlockchain) {
        this.server = _server;
        this.ultraApi = ultra;
    }

    async start() {
        this.setupRoutes();
    }

    private setupRoutes() {
        console.log('Adding routes for AccountCreationService');

        this.server.addRoute('get', '/getAccountsByKey/:key', async (request: FastifyRequest) => {
            const params = (request.params) as { key: string };
            console.log(params);
            return await this.ultraApi.fetchAccountsByKey(params.key);
        });

        this.server.addRoute('post', '/createAccount', async (request) => {
            const body = request.body as {
                ownerKey: string;
                activeKey: string;
                captcha: string;
            };

            if (!body.captcha) {
                throw new Error('MISSING_CAPTCHA');
            }

            if (body.activeKey === '') {
                body.activeKey = body.ownerKey;
            }

            const captchaStatus = await this.server.validateCaptchaResponse(body.captcha);

            if (!captchaStatus) {
                throw new Error('INVALID_CAPTCHA');
            }

            const accountCreationStatus = await this.ultraApi.newNonEbaAccount(
                body.ownerKey,
                body.activeKey,
                "10.00000000 UOS",
                true
            );

            if (accountCreationStatus) {
                if (accountCreationStatus.accounts) {
                    return {accounts: accountCreationStatus.accounts};
                } else {
                    return accountCreationStatus;
                }
            } else {
                throw new Error('FAILED');
            }

        });
    }
}
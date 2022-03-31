import Fastify, {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify'
import got from "got";
import fastifyCors from "fastify-cors";

export class ApiServer {

    private fastify: FastifyInstance = Fastify({
        logger: false,
    })

    config: GlobalConfig;

    constructor(config: GlobalConfig) {

        this.config = config;

        this.fastify.register(fastifyCors,{
            origin: [
                'http://localhost:4200',
                'testnet.ultra.eosrio.io'
            ]
        });

        this.addRoute("get", '/health', async () => {
            const info = await this.fastify.ultra.rpc.get_info();
            return {
                timestamp: new Date().toISOString(),
                chainInfo: {
                    headBlockNum: info.head_block_num,
                    headBlockTime: info.head_block_time,
                    lastIrreversibleBlockNum: info.last_irreversible_block_num
                }
            }
        });

        this.addRoute('post', '/validateCaptcha', async (request) => {
            const body = request.body as any;
            console.log(body);
            const headers = request.headers as any;
            console.log(headers);
            return {};
        });
    }

    async validateCaptchaResponse(data: string) {
        if (data) {
            const result = await got.post('https://www.google.com/recaptcha/api/siteverify', {
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                body: `secret=${this.config.captchaSecret}&response=${data}`
            }).json() as any;
            console.log(result);
            if (result.success === true) {
                return true;
            } else {
                console.log(result);
                return false;
            }
        } else {
            return false;
        }
    }

    async init() {
        try {
            await this.fastify.listen(3000, '0.0.0.0');
            const address = this.fastify.server.address()
            const port = typeof address === 'string' ? address : address?.port
            console.log(`✅ Listening on port ${port}`);
        } catch (e) {
            console.log(e);
        }
    }

    addRoute(method: 'get' | 'post', path: string, handler: (request: FastifyRequest) => Promise<any>) {
        this.fastify[method](path, async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const timeRef = Date.now();
                const result = await handler(request);
                const elapsedTime = Date.now() - timeRef;
                if (result) {
                    reply.send({
                        status: true,
                        query_ms: elapsedTime,
                        data: result
                    });
                } else {
                    reply.status(204).send({
                        status: false,
                        error: 'NO_CONTENT'
                    });
                }
            } catch (e: any) {
                reply.status(400).send({
                    status: false,
                    error: e.message
                });
            }
        });
    }

    printRoutes() {
        return this.fastify.printRoutes();
    }

    decorate(name: string, injectedObject: any) {
        this.fastify.decorate(name, injectedObject);
    }
}
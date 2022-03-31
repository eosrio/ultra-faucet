import {UltraBlockchain} from "../../src/modules/ultra.js";

declare module 'fastify' {
    export interface FastifyInstance {
        ultra: UltraBlockchain
    }
}
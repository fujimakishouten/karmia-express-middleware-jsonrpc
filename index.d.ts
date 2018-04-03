import KarmiaJSONRPC = require("karmia-jsonrpc");

declare class KarmiaExpressMiddlewareJSONRPC {
    methods: KarmiaJSONRPC;

    constructor(options?: object);
    middleware(): Function;
}

export = KarmiaExpressMiddlewareJSONRPC;

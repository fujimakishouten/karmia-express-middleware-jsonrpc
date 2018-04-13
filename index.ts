/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/* eslint-env es6, mocha, node */
/* eslint-extends: eslint:recommended */
'use strict';


// Import modules
import KarmiaRPC = require("karmia-rpc");
import KarmiaJSONRPC = require("karmia-jsonrpc");


// Declaration
declare interface Methods {
    [index: string]: Function|object;
}

declare interface Parameters {
    [index: string]: any;
}


/**
 * KarmiaExpressMiddlewareJSONRPC
 *
 * @class
 */
class KarmiaExpressMiddlewareJSONRPC {
    /**
     * Properteis
     */
    public rpc: KarmiaJSONRPC;
    public methods: KarmiaRPC;

    /**
     * Constructor
     *
     * @constructs KarmiaExpressMiddlewareJSONRPC
     * @returns {Object}
     */
    constructor(options?: Methods) {
        const self = this;
        self.rpc = new KarmiaJSONRPC(options);
        self.methods = self.rpc.methods;
    }

    /**
     * Get express middleware function
     *
     * @returns {function}
     */
    middleware() {
        const self = this;

        return (req?: Parameters, res?: Parameters, next?: Function) => {
            if (res.body) {
                return next();
            }

            req.api = true;
            self.methods.emit('api.call', req.body);
            self.rpc.call(req.context, req.body).then((result) => {
                self.methods.emit('api.done');

                res.code = result.status;
                res.body = result.body || '';

                next();
            });
        };
    }
}


// Export modules
export = KarmiaExpressMiddlewareJSONRPC;



/*
 * Local variables:
 * tab-width: 4
 * c-basic-offset: 4
 * c-hanging-comment-ender-p: nil
 * End:
 */

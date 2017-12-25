/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/* eslint-env es6, mocha, node */
/* eslint-extends: eslint:recommended */
'use strict';



// Variables
const karmia_jsonrpc = require('karmia-jsonrpc'),
    karmia_converter_jsonrpc = require('karmia-converter-jsonrpc');


/**
 * KarmiaExpressMiddlewareJSONRPC
 *
 * @class
 */
class KarmiaExpressMiddlewareJSONRPC {
    /**
     * Constructor
     *
     * @constructs KarmiaExpressMiddlewareJSONRPC
     * @returns {Object}
     */
    constructor(options) {
        const self = this;
        self.rpc = karmia_jsonrpc(options);
        self.converter = karmia_converter_jsonrpc();
        self.methods = self.rpc.methods;
    }

    /**
     * Get express middleware function
     *
     * @returns {function}
     */
    middleware() {
        const self = this;

        return (req, res, next) => {
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
module.exports = function (options) {
    return new KarmiaExpressMiddlewareJSONRPC(options);
};



/*
 * Local variables:
 * tab-width: 4
 * c-basic-offset: 4
 * c-hanging-comment-ender-p: nil
 * End:
 */

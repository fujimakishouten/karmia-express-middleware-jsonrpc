/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/* eslint-env es6, mocha, node */
/* eslint-extends: eslint:recommended */
'use strict';



// Variables
const karmia_rpc = require('karmia-rpc');


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
        self.methods = karmia_rpc(options);
    }

    /**
     * Convert from KarmiaRPC response to JSON-RPC 2.0 response
     *
     * @param   {Object} request
     * @param   {Object} response
     * @returns {Object}
     */
    convert(request, response) {
        const batch = Array.isArray(request);
        request = (batch) ? request : [(request || {})];
        response = (batch) ? response : [(response || {})];

        const result = response.reduce(function (result, values, index) {
            const id = request[index].id;
            if (!id) {
                return result;
            }

            const data = {
                    jsonrpc: '2.0',
                    id: id
                };
            if (values instanceof Error) {
                data.error = Object.getOwnPropertyNames(values).reduce(function (error, property_name) {
                    error[property_name] = values[property_name];

                    return error;
                }, {});
            } else {
                data.result = values;
            }
            result.push(data);

            return result;
        }, []);

        if (!result.length) {
            return null;
        }

        return (batch) ? result : result[0];
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
            self.methods.call(req.context, req.body || {}).then((result) => {
                return Promise.resolve(result);
            }).catch(function (error) {
                return Promise.resolve(error);
            }).then(function (result) {
                return Promise.resolve(self.convert(req.body, result));
            }).then(function (result) {
                self.methods.emit('api.done');

                res.code = (null === result) ? 204 : 200;
                res.body = result;

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

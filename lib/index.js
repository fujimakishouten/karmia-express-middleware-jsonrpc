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
        const self = this,
            batch = Array.isArray(request);
        request = (batch) ? request : [(request || {})];
        response = (batch) ? response : [(response || {})];

        const result = response.reduce(function (result, values, index) {
            if (!('id' in request[index])) {
                return result;
            }

            const data = {
                jsonrpc: '2.0',
                id: request[index].id
            };
            if (values instanceof Error) {
                data.error = Object.getOwnPropertyNames(values).reduce(function (error, property_name) {
                    error[property_name] = values[property_name];

                    return error;
                }, {});

                data.error = self.convertError(data.error, request[index]);
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
     * Convert error object
     *
     * @param {Object} error
     * @param {Object} request
     * @returns {Object}
     */
    convertError(error, request) {
        const code = error.code,
            message = (error.message) ? error.message.toLowerCase() : '';

        if ('not found' === message) {
            error.code = -32601;
            error.message = 'Method not found';

            return error;
        }

        if ('bad request' === message) {
            error.code = -32602;
            error.message = 'Invalid params';

            return error;
        }

        if ('internal server error' === message) {
            error.code = -32603;
            error.message = 'Internal error';

            return error;
        }

        return error;
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
            const batch = Array.isArray(req.body),
                requests = (batch) ? req.body : [req.body],
                parallels = requests.reduce(function (collection, request) {
                    if (!request.method || '2.0' !== request.jsonrpc) {
                        const error = new Error('Invalid request');
                        error.code = -32600;

                        collection.push(Promise.resolve(error));
                    }

                    collection.push(self.methods.call(req.context, request).catch(function (error) {
                        return Promise.resolve(error);
                    }));

                    return collection;
                }, []);


            Promise.all(parallels).then(function (result) {
                return self.convert(req.body, (batch) ? result : result[0]);
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

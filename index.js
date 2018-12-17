"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isNull(val) {
    return val === undefined || val === null;
}
var BatcherToken = /** @class */ (function () {
    function BatcherToken() {
    }
    return BatcherToken;
}());
exports.BatcherToken = BatcherToken;
/**
 * If this token is returned in the results from a batchingFunction, the corresponding requests will be placed back
 * into the the head of the queue.
 */
exports.BATCHER_RETRY_TOKEN = new BatcherToken();
// tslint:disable-next-line:max-classes-per-file
var Batcher = /** @class */ (function () {
    function Batcher(options) {
        this._maxBatchSize = Infinity;
        this._queuingDelay = 1;
        this._inputQueue = [];
        this._outputQueue = [];
        this._waiting = false;
        this._activePromiseCount = 0;
        this._immediateCount = 0;
        this._batchingFunction = options.batchingFunction;
        this._delayFunction = options.delayFunction;
        if (Array.isArray(options.queuingThresholds)) {
            if (!options.queuingThresholds.length) {
                throw new Error("options.batchThresholds must contain at least one number");
            }
            options.queuingThresholds.forEach(function (n) {
                if (n < 1) {
                    throw new Error("options.batchThresholds must only contain numbers greater than 0");
                }
            });
            this._queuingThresholds = options.queuingThresholds.slice();
        }
        else {
            this._queuingThresholds = [1];
        }
        if (!isNull(options.maxBatchSize)) {
            if (options.maxBatchSize < 1) {
                throw new Error("options.batchSize must be greater than 0");
            }
            this._maxBatchSize = options.maxBatchSize;
        }
        if (!isNull(options.queuingDelay)) {
            if (options.queuingDelay < 0) {
                throw new Error("options.queuingDelay must be greater than or equal to 0");
            }
            this._queuingDelay = options.queuingDelay;
        }
    }
    /**
     * Returns a promise which resolves or rejects with the individual result returned from the batching function.
     */
    Batcher.prototype.getResult = function (input) {
        var index = this._inputQueue.length;
        this._inputQueue[index] = input;
        return new Promise(function (resolve, reject) {
            this._outputQueue[index] = { resolve: resolve, reject: reject };
            this._trigger();
        }.bind(this));
    };
    /**
     * Triggers a batch to run, bypassing the queuingDelay while respecting other imposed delays.
     */
    Batcher.prototype.send = function () {
        // no inputs?
        // delayed?
        this._immediateCount = this._inputQueue.length;
        this._trigger();
    };
    /**
     * Triggers a batch to run, adhering to the maxBatchSize, queueingThresholds, and queuingDelay
     */
    Batcher.prototype._trigger = function () {
        var _this = this;
        // If the batch is set to run immediately, there is nothing more to be done
        if (this._waiting && !this._waitTimeout) {
            return;
        }
        // Always obey the queuing threshold
        var thresholdIndex = Math.min(this._activePromiseCount, this._queuingThresholds.length - 1);
        if (this._inputQueue.length < this._queuingThresholds[thresholdIndex]) {
            return;
        }
        // If the queue has reached the maximum batch size, start it immediately
        if (this._inputQueue.length >= this._maxBatchSize || this._immediateCount) {
            if (this._waitTimeout) {
                clearTimeout(this._waitTimeout);
                this._waitTimeout = undefined;
            }
            this._waiting = true;
            this._run();
            return;
        }
        if (this._waiting) {
            return;
        }
        // Run the batch, but with a delay
        this._waiting = true;
        // Tests showed that nextTick would commonly run before promises could resolve.
        // SetImmediate would run later than setTimeout as well.
        this._waitTimeout = setTimeout(function () {
            _this._waitTimeout = undefined;
            _this._run();
        }, this._queuingDelay);
    };
    /**
     * Runs the batch, while respecting delays imposed by the supplied delayFunction
     */
    Batcher.prototype._run = function () {
        var _this = this;
        if (this._delayFunction) {
            var result = void 0;
            try {
                result = this._delayFunction();
            }
            catch (err) {
                result = Promise.reject(err);
            }
            if (!isNull(result)) {
                var resultPromise = result instanceof Promise ? result : Promise.resolve(result);
                resultPromise
                    .then(function () {
                    _this._runImmediately();
                })
                    .catch(function (err) {
                    _this._inputQueue.length = 0;
                    var promises = _this._outputQueue.splice(0, _this._outputQueue.length);
                    promises.forEach(function (promise) {
                        promise.reject(err);
                    });
                    _this._waiting = false;
                });
                return;
            }
        }
        this._runImmediately();
    };
    /**
     * Runs the batch immediately without further delay
     */
    Batcher.prototype._runImmediately = function () {
        var _this = this;
        var inputs = this._inputQueue.splice(0, this._maxBatchSize);
        var outputPromises = this._outputQueue.splice(0, this._maxBatchSize);
        if (this._immediateCount) {
            this._immediateCount = Math.max(0, this._immediateCount - inputs.length);
        }
        var batchPromise;
        try {
            batchPromise = this._batchingFunction.call(this, inputs);
            if (!(batchPromise instanceof Promise)) {
                batchPromise = Promise.resolve(batchPromise);
            }
        }
        catch (err) {
            batchPromise = Promise.reject(err);
        }
        this._waiting = false;
        this._activePromiseCount++;
        batchPromise
            .then(function (outputs) {
            var _a, _b;
            if (!Array.isArray(outputs)) {
                throw new Error("Invalid type returned from batching function.");
            }
            if (outputs.length !== outputPromises.length) {
                throw new Error("Batching function output length does not equal the input length.");
            }
            var retryInputs = [];
            var retryPromises = [];
            outputPromises.forEach(function (promise, index) {
                var output = outputs[index];
                if (output === exports.BATCHER_RETRY_TOKEN) {
                    retryInputs.push(inputs[index]);
                    retryPromises.push(promise);
                }
                else if (output instanceof Error) {
                    promise.reject(output);
                }
                else {
                    promise.resolve(output);
                }
            });
            if (retryPromises.length) {
                if (_this._immediateCount) {
                    _this._immediateCount += retryPromises.length;
                }
                (_a = _this._inputQueue).unshift.apply(_a, retryInputs);
                (_b = _this._outputQueue).unshift.apply(_b, retryPromises);
            }
        })
            .catch(function (err) {
            outputPromises.forEach(function (promise) {
                promise.reject(err);
            });
        })
            .then(function () {
            _this._activePromiseCount--;
            // Since we may be operating at a lower queuing threshold now, we should try run again
            _this._trigger();
        });
        // The batch has started. Trigger another batch if appropriate.
        this._trigger();
    };
    return Batcher;
}());
exports.Batcher = Batcher;

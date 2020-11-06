const EventEmitter = require('events').EventEmitter
const process = require('process')
const OnError = require('./onerror')

let STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
let ARGUMENT_NAMES = /([^\s,]+)/g;
let getParamNames = function(func) {
    let fnStr = func.toString().replace(STRIP_COMMENTS, '');
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if(result === null) result = [];
    return result;
}

class Pipeline {

    constructor(id=undefined, initialVariables=undefined) {
        this.id = id
        this.pid = process.pid
        this.emitter = new EventEmitter()
        this.steps = []
        this.initialVariables = initialVariables
        this.initVariables()
        this.execTime = {}
    }

    initVariables() {
        this.variables = {}
        if (this.initialVariables) {
            for (let key in this.initialVariables) {
                this.variables[key] = this.initialVariables[key]
            }
        }
    }

    log(text) {
        if (this.id) return `[${this.id}][${new Date().toLocaleTimeString()}] ${text}`
        else return `[PID ${this.pid}][${new Date().toLocaleTimeString()}] ${text}`
    }

    add(onError, ... functions) {

        this.steps.push({
            onError: onError,
            functions: functions 
        })

        return this
    }

    async perform() {

        // clear
        this.initVariables()
        this.execTime = {}

        let stepsCount = this.steps.length, i = 0
        while (i < stepsCount) {

            this.emitter.emit('log', this.log(`=== Step ${i+1} ===`))

            // exec async functions and record exec time if it's resolved
            const resArr = await Promise.allSettled(this.steps[i].functions.map(async (fn) => {

                // dynamically parsing function arguments
                let paramNames = getParamNames(fn)
                let params = []
                paramNames.forEach(name => {
                    params.push(this.variables[name])
                })

                const start = Date.now()
                let ret = await fn.apply(this, params)
                this.execTime[fn.name] = Date.now() - start

                this.emitter.emit('log', this.log(`${fn.name} completed in ${this.execTime[fn.name]} ms`))
                this.emitter.emit('record', { [fn.name]: this.execTime[fn.name] })

                return ret
            }))
            
            // print rejected functions or store resolved values
            let isRejected = false
            resArr.forEach((res, j) => {
                if (res.status === 'rejected') {
                    isRejected = true

                    this.emitter.emit('log', this.log(`${this.steps[i].functions[j].name} rejected for reason: ${JSON.stringify(res.reason)}`))
                    this.emitter.emit('err', this.log(`${this.steps[i].functions[j].name} rejected for reason: ${JSON.stringify(res.reason)}`))

                }
                else {
                    if (res.value === undefined) {

                    }
                    else if (res.value && res.value.constructor == Object) {
                        this.variables = {
                            ... this.variables,
                            ... res.value
                        }
                        this.emitter.emit('log', this.log(`push ${JSON.stringify(res.value)} into pipeline.variables`))
                    }
                    else {
                        this.variables.returnVal = res.value
                        this.emitter.emit('log', this.log(`push { returnVal: ${JSON.stringify(res.value)} } into pipeline.variables`))
                    }
                }
            })

            if (isRejected && this.steps[i].onError === OnError.START_OVER) {
                i = 0
            }
            else if (isRejected && this.steps[i].onError === OnError.RETRY) {

            }
            else {
                i += 1
            }

        }
    }

}

module.exports = Pipeline
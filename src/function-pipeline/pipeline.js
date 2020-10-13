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

    constructor() {
        this.steps = []
        this.variables = {}
        this.execTime = {}
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
        this.variables = {}
        this.execTime = {}

        let stepsCount = this.steps.length, i = 0
        while (i < stepsCount) {

            console.log('==> Step ' + (i + 1) + ':')

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
                console.log(' * ' + fn.name + ' completed: ' + this.execTime[fn.name] + ' ms')
                return ret
            }))
            
            // print rejected functions or store resolved values
            let isRejected = false
            resArr.forEach((res, j) => {
                if (res.status === 'rejected') {
                    isRejected = true
                    console.log(' * ' + this.steps[i].functions[j].name + ' rejected for reason: ' + res.reason)
                }
                else {
                    if (res.value.constructor == Object) {
                        this.variables = {
                            ... this.variables,
                            ... res.value
                        }
                    }
                    else {
                        this.variables.returnVal = res.value
                    }
                }
                console.log(res)
            })
            console.log(this.variables)

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
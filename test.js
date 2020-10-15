const { FunctionPipeline, OnError } = require('./index');
const assert = require('assert').strict;

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// step 1: login
const login = () => {
    return new Promise( async (resolve, reject) => {
        await sleep(2000)
        resolve({ cookie: Math.random().toString(36).substring(7) })
    })
}

// step 2: upload file
const upload = (cookie) => {
    return new Promise( async (resolve, reject) => {
        await sleep(5000)
        console.log('upload file get cookie: ' + cookie)
        resolve({ handle: Math.random().toString(36).substring(7) })
    })
}

// step 3: keep polling until response status = completed
const waitForProcessingCompleted = async (cookie, handle) => {

    const poll = (cookie, handle, i) => {
        return new Promise( async (resolve, reject) => {

            await sleep(2000)
    
            if (i < 5) { reject('still processing') }
            else { resolve('processing completed') }
    
        })
    }

    console.log('upload file get cookie: ' + cookie + ' handle: ' + handle)

    let retry = 0, maxRetry = 30
    while (retry++ < maxRetry) {
        try {
            let res = await poll(cookie, handle, retry)
            return res
        }
        catch (e) {
            console.log(e)
        }
        await sleep(1000)
    }
}

// trigger operation 1 and operation 2 at the same time
const customOperationOne = (cookie, handle) => {
    return new Promise( async (resolve, reject) => {
        await sleep(1500)
        resolve({operationOneRes: 'res one'})
    })
}

const customOperationTwo = (cookie, handle) => {
    return new Promise( async (resolve, reject) => {
        await sleep(3000)
        reject('operation 2 failed')
    })
}

(async () => {
    
    let pipeline = new FunctionPipeline()

    let logs = [], records = [], errs = []

    pipeline.emitter.on('log', function(data) {
        console.log(`\x1b[1m${data}\x1b[0m`)
        logs.push(data)
    })
    pipeline.emitter.on('record', function(data) {
        console.log(`\x1b[44m${JSON.stringify(data)}\x1b[0m`)
        records.push(data)
    })
    pipeline.emitter.on('err', function(data) {
        console.log(`\x1b[41m${data}\x1b[0m`)
        errs.push(data)
    })

    // build the pipeline and run it
    await pipeline.add(OnError.RETRY, login)
                  .add(OnError.RETRY, upload)
                  .add(OnError.RETRY, waitForProcessingCompleted)
                  .add(OnError.CONTINUE, customOperationOne, customOperationTwo)
                  .perform()

    console.log(`==> pipeline.variables = ${JSON.stringify(pipeline.variables)}`)
    console.log(`==> pipeline.execTime = ${JSON.stringify(pipeline.execTime)}`)

    // run the pipeline with the same steps again
    await pipeline.perform()

    console.log(`==> pipeline.variables = ${JSON.stringify(pipeline.variables)}`)
    console.log(`==> pipeline.execTime = ${JSON.stringify(pipeline.execTime)}`)
    
})();

async () => {

    const fnWouldBeResolved = () => {
        return new Promise((resolve, reject) => setTimeout(resolve, 5000, { key: 'foo' }))
    }

    const fnWouldBeRejected = () => {
        return new Promise((resolve, reject) => setTimeout(reject, 5000, { 'foo': 'bar' }))
    }

    const normalFnOne = () => { return 'step-1 function' }

    const normalFnTwo = () => { return 'step-2 function' }

    let pipeline = new FunctionPipeline()

    let logs = [], records = [], errs = []

    pipeline.emitter.on('log', function(data) {
        console.log(data)
        logs.push(data)
    })
    pipeline.emitter.on('record', function(data) {
        console.log(data)
        records.push(data)
    })
    pipeline.emitter.on('errs', function(data) {
        console.log(data)
        errs.push(data)
    })

    await pipeline.add(OnError.CONTINUE, fnWouldBeRejected, fnWouldBeResolved, normalFnOne)
                  .add(OnError.CONTINUE, normalFnTwo, fnWouldBeRejected)
                  .perform()

}
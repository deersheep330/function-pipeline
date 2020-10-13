const { FunctionPipeline, OnError } = require('./function-pipeline');

(async () => {

    const resolveFn = async (cookie, workspaceId) => {
        return new Promise(async (resolve, reject) => await setTimeout(resolve, 5000, {fre:'foo'}));
    }

    const rejectFn = async (cookie) => {
        return new Promise(async (resolve, reject) => await setTimeout(reject, 5000, 'foo'));
    }

    const fn1_2 = () => { return 'step-1_2'; }

    const fn2 = () => { return 'step-2'; }
    

    let pipeline = new FunctionPipeline()
    await pipeline.add(OnError.CONTINUE, rejectFn, resolveFn, fn1_2).add(OnError.CONTINUE, fn2, rejectFn).perform()
    console.log('here')
    console.log(pipeline.execTime)
})()


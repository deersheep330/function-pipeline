# function-pipeline

__function-pipeline makes it easy to perform very complex, unstable load test.__

## Contents

- [Use Case](#use-case)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Demo](#demo)
- [License](#license)

## Use Case

__Imagine your boss want you to load test the following process on a system:__
- __(Step 1):__ User have to login to the system.
- __(Step 2):__ User upload a file to the system. __e.g. A file contains tons of numbers.__
- __(Step 3):__ User wait for the system processing the uploaded file. __e.g. The system have to parse all numbers in the file.__
- __(Step 4):__ User can simultaneously send multiple requests the the system to perform customized operations upon the processed data and wait for results. __e.g. Send 3 requests to ask the system to calculate stddev, median and avg at the same time.__

__Your boss want to know the system can support how many users performing this process before it collapses.__

__So you're load-testing a process consists of multiple API calls instead of a single API call.__

## Getting Started

Install this module using npm:

```javascript
npm i @deersheep330/function-pipeline
```

Import this module:

```javascript
const { FunctionPipeline, OnError } = require('@deersheep330/function-pipeline');
```

## Usage

- __Get pipeline instance__

```javascript
let pipeline = new FunctionPipeline()
```

- __Define a step by adding functions into the pipeline__

A step is defined by calling the add(onError, ... functions) method of pipeline instance.

You can pass arbitrary numbers of functions into the "add" method to define a step contains multiple functions. These functions would all be called at the same time and this step is finished if and only if all the functions are resolved or rejected. 

The onError argument could be OnError.RETRY, OnError.START_OVER or OnError.CONTINUE.

For OnError.RETRY, if any of functions in this step is rejected, the pipeline would re-run this step again.

For OnError.START_OVER, if any of functions in this step is rejected, the pipeline would re-run from the first step again.

For OnError.CONTINUE, if any of functions in this step is rejected, the error would be ignored, which means: the pipeline would proceed to the next step when all the functions in the step are returned, no matter it's resolved or rejected. 

The following code defined a 3-steps pipeline. Each step contains only one function:

step 1 - login

step 2 - download

step 3 - logout

This pipeline would run these 3 steps sequentially.

If step 1 is rejected, it would try to step 1 again.

If step 2 is rejected, it would start from step 1 again.

If step 3 is rejected, it would ignore error and continue.

By calling the perform() method of pipeline instance, the pipeline would start to run these defined steps.

```javascript
let login = async () => { await request('/login') }
let download = async () => { await request('/download') }
let logout = async () => { await request('/logout') }

pipeline.add(OnError.RETRY, login)
        .add(OnError.START_OVER, download)
        .add(OnError.CONTINUE, logout)
        .perform()
```

- __Define a step runs multiple functions parallelly__

By passing multiple functions into a "add" method, these functions would all be called at the same time and this step is finished unless the functions are resolved or rejected. Which means: These functions are run parallelly instead of sequentially.

```javascript
let task1 = async () => { await doSomething() }
let task2 = async () => { await doSomething() }
let task3 = async () => { await doSomething() }

pipeline.add(OnError.CONTINUE, task1, task2, task3).perform()
```

- __Function parameters__

What if a function is dependent on another function's result?

e.g. There are two functions: login & download. "login" returns a cookie, and "download" requires a logined user so it needs the cookie returned by "login".

```javascript
let login = async () => { await request('/login') }
let download = async (cookie) => { await request('/download', cookie) }
```

FunctionPipeline already take care this for you :)

Once a function resolved in the pipeline instance, the resolved value would be stored in a dictionary in the pipeline instance. (So it requires the resolved value to be a key-value pair.) 

If a step contains a function which has arguments, the arguments names would be parsed, and try to find these arguments names in the dictionary, and automatically pass the value found into the function.

So back to our example: the "login" and "download" functions just need a little modification to follow FunctionPipeline's design:

```javascript
// "login" needs to return a key-value pair, and the key has to exactly match "download"'s argument name
// the key-value pair would be stored in a dictionary
let login = async () => { let cookieVal = await request('/login'); resolve({ cookie: cookieVal }) }

// after parsing, an argument named "cookie" is found.
// automatically lookup the dictionary and try to find a key named "cookie"
// if it's found, pass the value of the key to this "download" function
let download = async (cookie) => { await request('/download', cookie) }
```

- __Fetching logs__

There's an event emitter in the pipeline instance which emits different kinds of events so you can get the realtime progress and status of the pipeline:

```javascript
let pipeline = new FunctionPipeline()

// verbose logs, current steps, function's resolved or rejected
pipeline.emitter.on('log', function(data) {
    console.log(data)
})
// records of test results, the time consuming of each functions
pipeline.emitter.on('record', function(data) {
    console.log(data)
})
// contains error logs only, function's rejected reason
pipeline.emitter.on('err', function(data) {
    console.log(data)
})

// build the pipeline and run it
await pipeline.add(OnError.RETRY, login)
              .add(OnError.RETRY, upload)
              .perform()
```

## Demo

You can find more detailed example at [this project's test code](https://github.com/deersheep330/function-pipeline/blob/master/test.js).

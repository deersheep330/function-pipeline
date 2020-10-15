# function-pipeline

__function-pipeline makes it easy to perform very complex, unstable load test.__

## Contents

- [Use Case](#use-case)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [License](#license)

## Use Case

__Imagine your boss want you to load test the following process on a system:__
- __(Step 1):__ User have to login to the system.
- __(Step 2):__ User upload a file to the system. __e.g. A file contains tons of numbers.__
- __(Step 3):__ User wait for the system processing the uploaded file. __e.g. The system have to parse all numbers in the file.__
- __(Step 4):__ User can simultaneously send multiple requests the the system to perform customized operations upon the processed data and wait for results. __e.g. Send 3 requests to ask the system to calculate stddev, median and avg at the same time.__

__Your boss want to know the system can support how many users performing this process before it break down.__

__So you're load-testing a process consist of multiple API calls instead of a single API call__

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

## License


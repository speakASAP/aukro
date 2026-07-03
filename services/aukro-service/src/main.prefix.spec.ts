const { strict: assert } = require('assert');
const { RequestMethod } = require('@nestjs/common');
const { AUKRO_GLOBAL_PREFIX_EXCLUDES } = require('./main');

const replayContractExclude = AUKRO_GLOBAL_PREFIX_EXCLUDES.find((entry: any) =>
  entry.path === 'internal/aukro/order-affinity/replay-candidates'
);

assert.ok(replayContractExclude, 'Aukro must expose the Marketing replay contract without the /aukro global prefix');
assert.equal(replayContractExclude.method, RequestMethod.GET);

import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, 'executor.module.ts'), 'utf8');

assert.match(source, /import \{ AuthModule \} from '@aukro\/shared';/);
assert.match(source, /imports:\s*\[AukroPublicApiModule, AuthModule\]/);

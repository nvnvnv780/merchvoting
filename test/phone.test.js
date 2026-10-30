import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from '../src/phone.js';
test('normalizes Vietnamese domestic and international mobile numbers to one identity',()=>{for(const input of ['0912345678','+84 912 345 678','84912345678','0912.345.678'])assert.equal(normalizePhone(input),'0912345678');});
test('rejects missing, foreign, landline and malformed phone numbers',()=>{for(const input of ['',null,'123','0212345678','+1912345678','09123456789','<script>'])assert.equal(normalizePhone(input),null);});

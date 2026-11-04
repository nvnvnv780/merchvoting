import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VOTING_RESUMES_AT,VOTING_PAUSE_MESSAGE,availabilityRetryDelay,unavailableMessage} from '../src/availability.js';
test('scheduled time is exactly 07:00 Vietnam with no early polling',()=>{
 assert.equal(VOTING_RESUMES_AT,Date.parse('2026-11-05T07:00:00+07:00'));
 assert.equal(availabilityRetryDelay(VOTING_RESUMES_AT-10000),10000);
 assert.equal(availabilityRetryDelay(VOTING_RESUMES_AT),30000);
 assert.equal(availabilityRetryDelay(VOTING_RESUMES_AT+10000),30000);
 assert.equal(unavailableMessage(VOTING_RESUMES_AT-1),VOTING_PAUSE_MESSAGE);
 assert.notEqual(unavailableMessage(VOTING_RESUMES_AT),VOTING_PAUSE_MESSAGE);
});

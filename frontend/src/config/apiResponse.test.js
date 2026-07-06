import test from 'node:test';
import assert from 'node:assert/strict';
import { getApiData, getApiList } from './apiResponse.js';

test('getApiList unwraps an enveloped list response', () => {
  const tasks = [{ id: '1' }];
  assert.equal(getApiList({ success: true, data: tasks }, 'Tasks'), tasks);
});

test('getApiList accepts a legacy raw list response', () => {
  const users = [{ id: '1' }];
  assert.equal(getApiList(users, 'Users'), users);
});

test('getApiList rejects non-list payloads before they reach React', () => {
  assert.throws(
    () => getApiList({ success: true, data: {} }, 'Tasks'),
    /Tasks response must contain an array/
  );
});

test('getApiData unwraps an enveloped entity response', () => {
  const event = { id: '1' };
  assert.equal(getApiData({ success: true, data: event }), event);
});

import request from 'supertest';
import matchers from 'jest-supertest-matchers';
import faker from 'faker';

import app from '../src';

describe('requests', () => {
  let server;

  beforeAll(() => {
    jasmine.addMatchers(matchers);
  });

  beforeEach(() => {
    server = app().listen();
  });

  it('GET 200', async () => {
    const res = await request.agent(server)
      .get('/');
    expect(res).toHaveHTTPStatus(200);
  });

  it('GET 404', async () => {
    const res = await request.agent(server)
      .get('/wrong-path');
    expect(res).toHaveHTTPStatus(404);
  });

  it('sign up', async () => {
    const res = await request.agent(server)
      .post('/users')
      .send({
        form: {
          email: faker.internet.email(),
          firstName: faker.name.firstName(),
          lastName: faker.name.lastName(),
          password: faker.internet.password(),
        },
      });
    expect(res).toHaveHTTPStatus(302);
    expect(res.headers.location).toBe('/');
  });

  it('sign in: wrong email or password or user not found', async () => {
    const res = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: faker.internet.email(),
          password: faker.internet.password(),
        },
      });
    expect(res).toHaveHTTPStatus(200);
  });

  it('sign in: success', async () => {
    const email = faker.internet.email();
    const password = faker.internet.password();
    await request.agent(server)
      .post('/users')
      .send({
        form: {
          email,
          firstName: faker.name.firstName(),
          lastName: faker.name.lastName(),
          password,
        },
      });
    const res = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email,
          password,
        },
      });
    expect(res).toHaveHTTPStatus(302);
    expect(res.headers.location).toBe('/');
  });

  it('sign out', async () => {
    const res = await request.agent(server).delete('/session');
    expect(res).toHaveHTTPStatus(302);
    expect(res.headers.location).toBe('/');
  });

  it('can not view other profile', async () => {
    const res = await request.agent(server)
      .get('/users/1');
    expect(res).toHaveHTTPStatus(302);
    expect(res.headers.location).toBe('/session/new');
  });

  it('can not update other profile', async () => {
    const res = await request.agent(server)
      .patch('/users/1');
    expect(res).toHaveHTTPStatus(302);
    expect(res.headers.location).toBe('/session/new');
  });

  it('can not edit other profile', async () => {
    const res = await request.agent(server)
      .get('/users/1/edit');
    expect(res).toHaveHTTPStatus(302);
    expect(res.headers.location).toBe('/session/new');
  });

  it('can not delete other profile', async () => {
    const res = await request.agent(server)
      .delete('/users/1');
    expect(res).toHaveHTTPStatus(302);
    expect(res.headers.location).toBe('/session/new');
  });

  afterEach((done) => {
    server.close();
    done();
  });
});

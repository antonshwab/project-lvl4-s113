import request from 'supertest';
import matchers from 'jest-supertest-matchers';
import faker from 'faker';

import app from '../src';
import container from '../src/container';
import init from '../src/init';

const userData1 = {
  email: faker.internet.email(),
  password: faker.internet.password(),
  firstName: faker.name.firstName(),
  lastName: faker.name.lastName(),
};

const userData2 = {
  email: faker.internet.email(),
  password: faker.internet.password(),
  firstName: faker.name.firstName(),
  lastName: faker.name.lastName(),
};

describe('requests', () => {
  let server;

  beforeAll(async () => {
    jasmine.addMatchers(matchers);
    await init();
  });

  beforeEach(async () => {
    const testApp = app();
    server = testApp.listen();
    await container.User.destroy({ truncate: true });
    await container.Task.destroy({ truncate: true });
    await container.Tag.destroy({ truncate: true });
    await container.TaskTag.destroy({ truncate: true });
  });

  afterEach((done) => {
    server.close();
    done();
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

  it('GET /session/new', async () => {
    const res = await request.agent(server)
      .get('/session/new');
    expect(res).toHaveHTTPStatus(200);
  });

  it('POST /session', async () => {
    await container.User.create(userData1);
    const authRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: userData1.email,
          password: userData1.password,
        },
      });
    expect(authRes).toHaveHTTPStatus(302);
  });

  it('DELETE /session', async () => {
    await container.User.create(userData1);
    const authRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: userData1.email,
          password: userData1.password,
        },
      });
    expect(authRes).toHaveHTTPStatus(302);
    const cookie = authRes.headers['set-cookie'];

    const res = await request.agent(server)
      .delete('/session')
      .set('Cookie', cookie);
    expect(res).toHaveHTTPStatus(302);
  });

  it('GET /', async () => {
    const res = await request.agent(server)
      .get('/');
    expect(res).toHaveHTTPStatus(200);
  });

  it('GET /users/new', async () => {
    const res = await request.agent(server)
      .get('/users/new');
    expect(res).toHaveHTTPStatus(200);
  });

  it('POST /users', async () => {
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

  it('create task without tags', async () => {
    const user1 = await container.User.create(userData1);
    const authRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: userData1.email,
          password: userData1.password,
        },
      });
    expect(authRes).toHaveHTTPStatus(302);
    expect(authRes.headers.location).toBe('/');
    const cookies = authRes.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]);
    const cookie = cookies.join(';');

    const taskForm = {
      name: faker.name.title(),
      description: faker.name.jobDescriptor(),
      statusId: 1,
      assignedToId: user1.id,
    };

    const res = await request.agent(server)
      .post('/tasks')
      .set('Cookie', cookie)
      .type('form')
      .send({ form: taskForm });
    expect(res).toHaveHTTPStatus(302);
    expect(res.headers.location).toBe('/tasks');

    const task = await container.Task.findOne({
      where: {
        name: taskForm.name,
        creatorId: user1.id,
        assignedToId: user1.id,
      },
    });
    expect(task.creatorId).toBe(user1.id);
  });

  it('create task with tags', async () => {
    const user1 = await container.User.create(userData1);
    const authRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: userData1.email,
          password: userData1.password,
        },
      });
    expect(authRes).toHaveHTTPStatus(302);
    expect(authRes.headers.location).toBe('/');
    const cookies = authRes.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]);
    const cookie = cookies.join(';');

    const taskForm = {
      name: faker.name.title(),
      description: faker.name.jobDescriptor(),
      statusId: 1,
      assignedToId: user1.id,
      tags: 'tag1, tag2 and bla-bla, tag3',
    };

    const res = await request.agent(server)
      .post('/tasks')
      .set('Cookie', cookie)
      .type('form')
      .send({ form: taskForm });
    expect(res).toHaveHTTPStatus(302);
    expect(res.headers.location).toBe('/tasks');

    const task = await container.Task.findOne({
      where: {
        name: taskForm.name,
        creatorId: user1.id,
        assignedToId: user1.id,
      },
    });
    expect(task.creatorId).toBe(user1.id);
  });

  it('read task', async () => {
    const user1 = await container.User.create(userData1);
    const authRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: userData1.email,
          password: userData1.password,
        },
      });
    expect(authRes).toHaveHTTPStatus(302);
    expect(authRes.headers.location).toBe('/');
    const cookies = authRes.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]);
    const cookie = cookies.join(';');

    const taskForm = {
      name: faker.name.title(),
      description: faker.name.jobDescriptor(),
      statusId: 1,
      assignedToId: user1.id,
      tags: 'tag1, tag2 and bla-bla, tag3',
    };

    await request.agent(server)
      .post('/tasks')
      .set('Cookie', cookie)
      .type('form')
      .send({ form: taskForm });

    const task = await container.Task.findOne({
      where: {
        name: taskForm.name,
        creatorId: user1.id,
        assignedToId: user1.id,
      },
    });
    const res = await request.agent(server).get(`/tasks/${task.id}`);
    expect(res).toHaveHTTPStatus(200);
  });

  it('update created task', async () => {
    const user1 = await container.User.create(userData1);
    const user2 = await container.User.create(userData2);
    const authRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: userData1.email,
          password: userData1.password,
        },
      });
    expect(authRes).toHaveHTTPStatus(302);
    expect(authRes.headers.location).toBe('/');
    const cookies = authRes.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]);
    const cookie = cookies.join(';');

    const taskForm = {
      name: faker.name.title(),
      description: faker.name.jobDescriptor(),
      statusId: 1,
      assignedToId: user1.id,
      tags: 'tag1',
    };

    await request.agent(server)
      .post('/tasks')
      .set('Cookie', cookie)
      .type('form')
      .send({ form: taskForm });

    const task = await container.Task.findOne({
      where: {
        name: taskForm.name,
      },
    });

    const updatedTaskForm = {
      name: faker.name.title(),
      description: faker.name.jobDescriptor(),
      statusId: 3,
      assignedToId: user2.id,
      tags: 'tag1, tag2',
    };

    await request.agent(server)
      .patch(`/tasks/${task.id}`)
      .set('Cookie', cookie)
      .type('form')
      .send({ form: updatedTaskForm });

    const res = await request.agent(server).get(`/tasks/${task.id}`);
    expect(res).toHaveHTTPStatus(200);

    const updatedTask = await container.Task.findOne({
      where: {
        name: updatedTaskForm.name,
        assignedToId: updatedTaskForm.assignedToId,
        statusId: updatedTaskForm.statusId,
        description: updatedTaskForm.description,
      },
    });
    expect.anything(updatedTask);
  });

  it('update assinged task', async () => {
    const user1 = await container.User.create(userData1);
    const user2 = await container.User.create(userData2);
    const authRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: user1.email,
          password: userData1.password,
        },
      });
    expect(authRes).toHaveHTTPStatus(302);
    expect(authRes.headers.location).toBe('/');
    const cookies = authRes.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]);
    const cookie = cookies.join(';');

    const taskForm = {
      name: faker.name.title(),
      description: faker.name.jobDescriptor(),
      statusId: 1,
      assignedToId: user2.id,
      tags: 'tag1',
    };

    await request.agent(server)
      .post('/tasks')
      .set('Cookie', cookie)
      .type('form')
      .send({ form: taskForm });

    const task = await container.Task.findOne({
      where: {
        name: taskForm.name,
      },
    });

    const user2AuthRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: user2.email,
          password: userData2.password,
        },
      });
    expect(user2AuthRes).toHaveHTTPStatus(302);
    expect(user2AuthRes.headers.location).toBe('/');
    const cookiesUser2 = user2AuthRes.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]);
    const cookieUser2 = cookiesUser2.join(';');

    const updatedTaskForm = {
      name: faker.name.title(),
      description: faker.name.jobDescriptor(),
      statusId: 3,
      assignedToId: user2.id,
      tags: 'tag1, tag2',
    };

    await request.agent(server)
      .patch(`/tasks/${task.id}`)
      .set('Cookie', cookieUser2)
      .type('form')
      .send({ form: updatedTaskForm });

    const res = await request.agent(server).get(`/tasks/${task.id}`);
    expect(res).toHaveHTTPStatus(200);

    const updatedTask = await container.Task.findOne({
      where: {
        name: updatedTaskForm.name,
        assignedToId: updatedTaskForm.assignedToId,
        statusId: updatedTaskForm.statusId,
        description: updatedTaskForm.description,
      },
    });
    expect.anything(updatedTask);
  });

  it('can not update isn\'t assinged/created task', async () => {
    const user1 = await container.User.create(userData1);
    const user2 = await container.User.create(userData2);
    const authRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: user1.email,
          password: userData1.password,
        },
      });
    expect(authRes).toHaveHTTPStatus(302);
    expect(authRes.headers.location).toBe('/');
    const cookies = authRes.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]);
    const cookie = cookies.join(';');

    const taskForm = {
      name: faker.name.title(),
      description: faker.name.jobDescriptor(),
      statusId: 1,
      assignedToId: user1.id,
      tags: 'tag1',
    };

    await request.agent(server)
      .post('/tasks')
      .set('Cookie', cookie)
      .type('form')
      .send({ form: taskForm });

    const task = await container.Task.findOne({
      where: {
        name: taskForm.name,
      },
    });

    const user2AuthRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: user2.email,
          password: userData2.password,
        },
      });
    expect(user2AuthRes).toHaveHTTPStatus(302);
    expect(user2AuthRes.headers.location).toBe('/');
    const cookiesUser2 = user2AuthRes.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]);
    const cookieUser2 = cookiesUser2.join(';');

    const updatedTaskForm = {
      name: faker.name.title(),
      description: faker.name.jobDescriptor(),
      statusId: 3,
      assignedToId: user2.id,
      tags: 'tag1, tag2',
    };

    const res = await request.agent(server)
      .patch(`/tasks/${task.id}`)
      .set('Cookie', cookieUser2)
      .type('form')
      .send({ form: updatedTaskForm });

    expect(res).toHaveHTTPStatus(403);
  });

  it('can not delete task isn\'t created by him', async () => {
    const user1 = await container.User.create(userData1);
    const user2 = await container.User.create(userData2);
    const authRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: user1.email,
          password: userData1.password,
        },
      });
    expect(authRes).toHaveHTTPStatus(302);
    expect(authRes.headers.location).toBe('/');
    const cookies = authRes.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]);
    const cookie = cookies.join(';');

    const taskForm = {
      name: faker.name.title(),
      description: faker.name.jobDescriptor(),
      statusId: 1,
      assignedToId: user1.id,
      tags: 'tag1',
    };

    await request.agent(server)
      .post('/tasks')
      .set('Cookie', cookie)
      .type('form')
      .send({ form: taskForm });

    const task = await container.Task.findOne({
      where: {
        name: taskForm.name,
      },
    });

    const user2AuthRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: user2.email,
          password: userData2.password,
        },
      });
    expect(user2AuthRes).toHaveHTTPStatus(302);
    expect(user2AuthRes.headers.location).toBe('/');
    const cookiesUser2 = user2AuthRes.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]);
    const cookieUser2 = cookiesUser2.join(';');

    const res = await request.agent(server)
      .delete(`/tasks/${task.id}`)
      .set('Cookie', cookieUser2)
      .type('form');

    expect(res).toHaveHTTPStatus(403);

    expect.anything(await container.Task.findById(task.id));
  });

  it('delete created task', async () => {
    const user1 = await container.User.create(userData1);
    const authRes = await request.agent(server)
      .post('/session')
      .send({
        form: {
          email: user1.email,
          password: userData1.password,
        },
      });
    expect(authRes).toHaveHTTPStatus(302);
    expect(authRes.headers.location).toBe('/');
    const cookies = authRes.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]);
    const cookie = cookies.join(';');

    const taskForm = {
      name: faker.name.title(),
      description: faker.name.jobDescriptor(),
      statusId: 1,
      assignedToId: user1.id,
      tags: 'tag1',
    };

    await request.agent(server)
      .post('/tasks')
      .set('Cookie', cookie)
      .type('form')
      .send({ form: taskForm });

    const task = await container.Task.findOne({
      where: {
        name: taskForm.name,
      },
    });

    const res = await request.agent(server)
      .delete(`/tasks/${task.id}`)
      .set('Cookie', cookie)
      .type('form');

    expect(res).toHaveHTTPStatus(302);
    expect(await container.Task.findById(task.id)).not.toBe(task);
  });
});

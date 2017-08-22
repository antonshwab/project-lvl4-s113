import rollbar from 'rollbar';
import { parse } from 'url';
import buildFormObj from '../lib/formObjectBuilder';
import {
  prepareTask,
  getWhere,
  getRequiredAuth,
  getRequiredExist,
  getRequiredRights,
} from '../lib/helpers';
import logger from '../lib/logger';

const log = logger('app:tasks');

export default (router, { Task, User, Tag, TaskStatus }) => {
  const reqAuth = getRequiredAuth(router);
  const reqExist = getRequiredExist(router, Task, 'Task no found');

  const reqRightsToEdit = getRequiredRights(
    'hasRightsToEditTask',
    Task,
    'This task isn\'t created by you or assigned to you. So..');

  const reqRightsToDelete = getRequiredRights(
    'hasRightsToDeleteTask',
    Task,
    'This task isn\'t created by you. So..');

  router
    .get('tasks', '/tasks', async (ctx) => {
      const { query } = parse(ctx.request.url, true);
      log('query: %o', query);

      const where = await getWhere(query, Tag);
      const filteredTasks = await Task.findAll({ where });
      const preparedTasks = await Promise.all(filteredTasks.map(t => prepareTask(t)));

      log('Prepared tasks: %o', preparedTasks);
      const statuses = await TaskStatus.findAll();
      const users = await User.findAll();
      const tags = await Tag.findAll();
      ctx.render('tasks', { preparedTasks, statuses, users, tags });
    })

    .get('newTask', '/tasks/new', reqAuth, async (ctx) => {
      const task = Task.build();
      const users = await User.findAll();
      ctx.render('tasks/new', { users, f: buildFormObj(task) });
    })

    .get('showTask', '/tasks/:id', reqExist, async (ctx) => {
      const taskId = Number(ctx.params.id);
      const task = await Task.findById(taskId);
      try {
        const preparedTask = await prepareTask(task);
        log('prepared Task: %o', preparedTask);
        ctx.render('tasks/show', { preparedTask });
      } catch (err) {
        log('Error from showTask: %s', err);
        throw err;
      }
    })

    .post('newTask', '/tasks', reqAuth, async (ctx) => {
      const form = ctx.request.body.form;
      form.creatorId = ctx.state.currentUser.id;
      log('Request form: %o', form);
      const users = await User.findAll();
      const task = Task.build(form);
      try {
        await task.save();
        if (form.tags && form.tags !== '') {
          const tags = form.tags.split(',');
          await tags.map(tag => Tag.findOne({ where: { name: tag } })
            .then(async result => (result ? task.addTag(result) :
              task.createTag({ name: tag }))));
        }
        ctx.flash.set('Task has been created');
        ctx.redirect(router.url('tasks'));
      } catch (err) {
        log('Post new task error: %o', err);
        rollbar.handleError(err);
        ctx.render('tasks/new', { users, f: buildFormObj(task, err) });
      }
    })

    .get('editTask', '/tasks/:id/edit', reqAuth, reqExist, reqRightsToEdit, async (ctx) => {
      const taskId = Number(ctx.params.id);
      const task = await Task.findById(taskId);
      log('Current task:', task);

      const users = await User.findAll();
      const preparedTask = await prepareTask(task);
      log('PreparedTask in editTask: %o', preparedTask);
      const statuses = await TaskStatus.findAll();
      ctx.render('tasks/edit', {
        preparedTask, users, statuses, f: buildFormObj(preparedTask),
      });
    })

    .patch('updateTask', '/tasks/:id', reqAuth, reqExist, reqRightsToEdit, async (ctx) => {
      const taskId = Number(ctx.params.id);
      const task = await Task.findById(taskId);

      log('Current task:', task);

      const form = ctx.request.body.form;
      log('Updated form: %o', form);

      try {
        await task.update({
          name: form.name,
          description: form.description,
          statusId: Number(form.statusId),
          assignedToId: Number(form.assignedToId),
        });
        const tags = form.tags.split(',');
        await tags.map(tag => Tag.findOne({ where: { name: tag } })
          .then(async result => (result ? task.addTag(result) :
            task.createTag({ name: tag }))));
        ctx.flash.set('Task has been updated');
        ctx.redirect(router.url('showTask', taskId));
      } catch (err) {
        log('Patch task error: %o', err);
        rollbar.handleError(err);
        throw err;
      }
    })

    .delete('deleteTask', '/tasks/:id', reqAuth, reqExist, reqRightsToDelete, async (ctx) => {
      const taskId = Number(ctx.params.id);
      await Task.destroy({ where: { id: taskId } });
      ctx.flash.set('Task has been deleted');
      ctx.redirect(router.url('tasks'));
    });
};

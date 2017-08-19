import rollbar from 'rollbar';
import { parse } from 'url';
import buildFormObj from '../lib/formObjectBuilder';
import { prepareTask, getWhere } from '../lib/helpers';
import logger from '../lib/logger';

const log = logger('app:tasks');

export default (router, { Task, User, Tag, TaskStatus }) => {
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

    .get('newTask', '/tasks/new', async (ctx) => {
      const userId = ctx.session.userId;
      if (!userId) {
        ctx.flash.set('You need sign in to create task');
        ctx.redirect(router.url('newSession'));
        return;
      }
      const task = Task.build();
      const users = await User.findAll();
      ctx.render('tasks/new', { users, f: buildFormObj(task) });
    })

    .get('showTask', '/tasks/:id', async (ctx) => {
      const taskId = Number(ctx.params.id);
      try {
        const task = await Task.findById(taskId);
        const preparedTask = await prepareTask(task);
        log('prepared Task: %o', preparedTask);
        ctx.render('tasks/show', { preparedTask });
      } catch (err) {
        log('Error from showTask: %s', err);
      }
    })

    .post('newTask', '/tasks', async (ctx) => {
      const userId = ctx.session.userId;
      if (!userId) {
        ctx.flash.set('You need sign in to create task');
        ctx.redirect(router.url('newSession'));
        return;
      }

      const form = ctx.request.body.form;
      form.creatorId = ctx.session.userId;
      log('Request form: %o', form);
      const users = await User.findAll();
      const tags = form.tags.split(',');
      const task = Task.build(form);
      try {
        await task.save();
        await tags.map(tag => Tag.findOne({ where: { name: tag } })
          .then(async result => (result ? task.addTag(result) :
            task.createTag({ name: tag }))));
        ctx.flash.set('Task has been created');
        ctx.redirect(router.url('tasks'));
      } catch (err) {
        log('Post new task error: %o', err);
        rollbar.handleError(err);
        ctx.render('tasks/new', { users, f: buildFormObj(task, err) });
      }
    })

    .get('editTask', '/tasks/:id/edit', async (ctx) => {
      const userId = Number(ctx.session.userId);
      if (!userId) {
        ctx.flash.set('You need sign in to update this task');
        ctx.redirect(router.url('newSession'));
        return;
      }

      const taskId = Number(ctx.params.id);
      const task = await Task.findById(taskId);
      log('Current task:', task);
      if (!task) {
        ctx.flash.set('This task don\'t exist');
        ctx.redirect(router.url('404'));
        return;
      }

      const isYourTask = [task.creatorId, task.assignedToId].includes(userId);
      if (!isYourTask) {
        ctx.flash.set('This task isn\'t created by you or assigned to you. So...');
        ctx.redirect(router.url('403'));
        return;
      }

      const users = await User.findAll();
      const preparedTask = await prepareTask(task);
      log('PreparedTask in editTask: %o', preparedTask);
      const statuses = await TaskStatus.findAll();
      ctx.render('tasks/edit', {
        preparedTask, users, statuses, f: buildFormObj(preparedTask),
      });
    })

    .patch('updateTask', '/tasks/:id', async (ctx) => {
      const userId = Number(ctx.session.userId);
      if (!userId) {
        ctx.flash.set('You need sign in to update this task');
        ctx.redirect(router.url('newSession'));
        return;
      }

      const taskId = Number(ctx.params.id);
      const task = await Task.findById(taskId);
      log('Current task:', task);
      if (!task) {
        ctx.flash.set('This task don\'t exist');
        ctx.redirect(router.url('404'));
        return;
      }

      const form = ctx.request.body.form;
      form.creatorId = userId;
      log('Updated form: %o', form);
      const isYourTask = [task.creatorId, task.assignedToId].includes(userId);
      if (!isYourTask) {
        ctx.flash.set('This task isn\'t created by you or assigned to you. So...');
        ctx.redirect(router.url('403'));
        return;
      }

      try {
        await task.update({
          name: form.name,
          description: form.description,
          statusId: Number(form.statusId),
          creatorId: Number(form.creatorId),
          assignedToId: Number(form.assignedToId),
        });
        const tags = form.tags.split(',');
        await tags.map(tag => Tag.findOne({ where: { name: tag } })
          .then(async result => (result ? task.addTag(result) :
            task.createTag({ name: tag }))));
        ctx.flash.set('Task has been updated');
        ctx.redirect(router.url('tasks'));
      } catch (err) {
        log('Post new task error: %o', err);
        rollbar.handleError(err);
      }
    })

    .delete('deleteTask', '/tasks/:id', async (ctx) => {
      if (!ctx.session.userId) {
        ctx.flash.set('You need sign in to delete this task');
        ctx.redirect(router.url('newSession'));
        return;
      }

      const taskId = Number(ctx.params.id);
      const task = await Task.findById(taskId);
      log('Current task for delete:', task);
      if (!task) {
        ctx.flash.set('This task don\'t exist');
        ctx.redirect(router.url('404'));
        return;
      }
      if (ctx.session.userId !== task.creatorId) {
        ctx.flash.set('You can not delete this task');
        ctx.redirect(router.url('403'));
        return;
      }
      await Task.destroy({ where: { id: taskId } });
      ctx.flash.set('Task has been deleted');
      ctx.redirect(router.url('tasks'));
    });
};

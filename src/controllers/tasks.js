import rollbar from 'rollbar';
import { parse } from 'url';
import buildFormObj from '../lib/formObjectBuilder';
import logger from '../lib/logger';

const log = logger('app:tasks');

const prepareTask = async (task) => {
  const creator = await task.getCreator();
  const assignedTo = await task.getAssignedTo();
  const status = await task.getStatus();
  const tags = await task.getTags();
  const id = task.id;
  const name = task.name;
  const description = task.description;
  const data = {
    id,
    name,
    description,
    assignedTo: assignedTo.fullName,
    creator: creator.fullName,
    status: status.name,
    tags: tags.map(tag => tag.name),
  };
  log('TaskData: %o', data);
  return data;
};

const getTaskIdRangeBy = async (tagId, Tag) => {
  const tag = await Tag.findById(Number(tagId));
  const tasks = await tag.getTasks();
  log('tasks in getTaskIdRange: %o', tasks);
  const tasksIdRange = await Promise.all(tasks.map(t => t.id));
  log('tasksIdRange: %o', tasksIdRange);
  return tasksIdRange;
};

const getWhere = async (query, Tag) => {
  log('input query in getWhere: %o', query);
  const where = await Object.keys(query)
    .filter(k => query[k] !== '')
    .reduce(async (acc, key) => {
      if (key === 'tagId') {
        const tasksIds = await getTaskIdRangeBy(query.tagId, Tag);
        acc.id = { $in: tasksIds };
        return acc;
      }
      acc[key] = query[key];
      return acc;
    }, {});
  log('where: %o', where);
  return where;
};

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
      if (ctx.session.userId) {
        const task = Task.build();
        const users = await User.findAll();
        ctx.render('tasks/new', { users, f: buildFormObj(task) });
      } else {
        ctx.flash.set('You need sign in to create task');
        ctx.redirect(router.url('newSession'));
      }
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
      if (ctx.session.userId) {
        const form = ctx.request.body.form;
        form.creatorId = ctx.session.userId;
        log('Request form: %o', form);
        const users = await User.findAll();
        const tags = form.tags.split(' ');
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
      } else {
        ctx.flash.set('You need sign in to create task');
        ctx.redirect(router.url('newSession'));
      }
    })
    .get('editTask', '/tasks/:id/edit', async (ctx) => {
      const taskId = Number(ctx.params.id);
      const task = await Task.findById(taskId);
      const userId = Number(ctx.session.userId);
      const isYourTask = [task.creatorId, task.assignedToId].includes(userId);
      log('is your task:', isYourTask, userId);
      if (userId && isYourTask) {
        const users = await User.findAll();
        const preparedTask = await prepareTask(task);
        log('PreparedTask in editTask: %o', preparedTask);
        const statuses = await TaskStatus.findAll();

        ctx.render('tasks/edit', {
          preparedTask, users, statuses, f: buildFormObj(preparedTask),
        });
        return;
      }
      if (!userId) {
        ctx.flash.set('You need sign in to edit this task');
        ctx.redirect(router.url('newSession'));
      } else {
        ctx.flash.set('This task isn\'t created by you or assigned to you. So...');
        ctx.redirect(router.url('tasks'));
      }
    })
    .patch('updateTask', '/tasks/:id', async (ctx) => {
      const userId = Number(ctx.session.userId);
      const taskId = Number(ctx.params.id);
      const form = ctx.request.body.form;
      form.creatorId = userId;
      log('Updated form: %o', form);

      const task = await Task.findById(taskId);
      const isYourTask = [task.creatorId, task.assignedToId].includes(userId);
      if (userId && isYourTask) {
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
        return;
      }
      if (!userId) {
        ctx.flash.set('You need sign in to edit this task');
        ctx.redirect(router.url('newSession'));
      } else {
        ctx.flash.set('This task isn\'t created by you or assigned to you. So...');
        ctx.redirect(router.url('tasks'));
      }
    })
    .delete('deleteTask', '/tasks/:id', async (ctx) => {
      const taskId = Number(ctx.params.id);
      const task = await Task.findById(taskId);
      if (ctx.session.userId === task.creatorId) {
        await Task.destroy({ where: { id: taskId } });
        ctx.flash.set('Task has been deleted');
        ctx.redirect(router.url('tasks'));
      } else {
        log('Else clause in deleteTask');
        ctx.flash.set('You need sign in or been creator to delete this task');
        ctx.redirect(router.url('tasks'));
      }
    });
};

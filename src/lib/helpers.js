import logger from './logger';

const log = logger('app:helpers');

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
    assignedToId: assignedTo.id,
    assignedTo: assignedTo.fullName,
    creator: creator.fullName,
    creatorId: creator.id,
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

const getRequiredAuth = (router, msg = 'You need sign in') =>
  async (ctx, next) => {
    if (!ctx.state.currentUser.isSignedIn()) {
      ctx.flash.set(msg);
      ctx.redirect(router.url('newSession'));
      return;
    }
    await next();
  };
const getRequiredExist = (router, resource, msg = 'Not Found') =>
  async (ctx, next) => {
    const resourceId = Number(ctx.params.id);
    const resourceInstance = await resource.findById(resourceId);
    if (!resourceInstance) {
      ctx.throw(404, msg);
    }
    await next();
  };

const getRequiredRights = (hasRights, resource, msg = 'Access denied') =>
  async (ctx, next) => {
    const resourceId = Number(ctx.params.id);
    const resourceInstance = await resource.findById(resourceId);
    if (!ctx.state.currentUser[hasRights](resourceInstance)) {
      ctx.throw(403, msg);
    }
    await next();
  };

export {
  getWhere,
  getTaskIdRangeBy,
  prepareTask,
  getRequiredAuth,
  getRequiredExist,
  getRequiredRights,
};

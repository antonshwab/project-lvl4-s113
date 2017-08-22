import connect from './db';
import getModels from './models';

export default async () => {
  const models = getModels(connect);

  await models.User.sync({ force: true });
  await models.Task.sync({ force: true });
  await models.TaskStatus.sync({ force: true });
  await models.Tag.sync({ force: true });
  await models.TaskTag.sync({ force: true });
  await models.TaskStatus.bulkCreate([
    { name: 'New' },
    { name: 'Working' },
    { name: 'Testing' },
    { name: 'Completed' },
  ]);
};

import welcome from './welcome';
import users from './users';
import sessions from './sessions';
import tasks from './tasks';
import redirects from './redirects';

const controllers = [welcome, users, sessions, tasks, redirects];

export default (router, container) => controllers.forEach(f => f(router, container));

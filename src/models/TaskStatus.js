import Sequelize from 'sequelize';

export default connect => connect.define('TaskStatus', {
  name: {
    type: Sequelize.STRING,
    defaultValue: 'New',
    unique: true,
    validate: {
      notEmpty: true,
    },
  },
});

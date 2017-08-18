import Sequelize from 'sequelize';

export default connect => connect.define('Task', {
  name: {
    type: Sequelize.STRING,
    validate: {
      notEmpty: true,
    },
    allowNull: false,
  },
  description: {
    type: Sequelize.TEXT,
  },

  statusId: {
    type: Sequelize.INTEGER,
    defaultValue: 1,
    max: 4,
    validate: {
      notEmpty: true,
    },
    allowNull: false,
  },

  creatorId: {
    type: Sequelize.INTEGER,
    validate: {
      notEmpty: true,
    },
    allowNull: false,
  },

  assignedToId: {
    type: Sequelize.INTEGER,
    validate: {
      notEmpty: true,
    },
    allowNull: false,
  },

}, {
  freezeTableName: true,
});

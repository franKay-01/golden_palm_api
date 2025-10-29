'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Blogs extends Model {
    static associate(models) {
      // define association here
    }

    toJSON(){
      return {...this.get(), id: undefined}
    }
  }
  Blogs.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Blog title is a required field"},
        notEmpty: {msg: "Blog title is a required field"}
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notNull: {msg: "Blog content is a required field"},
        notEmpty: {msg: "Blog content is a required field"}
      }
    },
    blog_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Blog author is a required field"},
        notEmpty: {msg: "Blog author is a required field"}
      }
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isArrayOfStrings(value) {
          if (value !== null && value !== undefined) {
            if (!Array.isArray(value)) {
              throw new Error('Tags must be an array');
            }
            if (!value.every(item => typeof item === 'string')) {
              throw new Error('All tag items must be strings');
            }
          }
        }
      }
    },
    img_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notNull: {msg: "Blog slug is a required field"},
        notEmpty: {msg: "Blog slug is a required field"},
        isSlug(value) {
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
            throw new Error('Slug must be lowercase with hyphens only');
          }
        }
      }
    },
    meta_description: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 160]
      }
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'blogs',
    modelName: 'Blogs',
  });
  return Blogs;
};
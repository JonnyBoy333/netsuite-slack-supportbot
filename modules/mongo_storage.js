var SlackModel = require('./../models/schemas');
var mongoose = require('mongoose');

/**
 * botkit-storage-mongoose - MongoDB/Mongoose driver for Botkit
 *
 * @param  {Object} config Must contain a mongoUri property
 * @return {Object} A storage object conforming to the Botkit storage interface
 */
module.exports = function(config) {

    if (!config || !config.mongoUri) {
        throw new Error('Need to provide mongo address.');
    }

    var storage = {};
    var zones = ['teams', 'channels', 'users'];

    zones.forEach(function(zone) {
        var model = SlackModel[zone];
        storage[zone] = getStorage(model);
    });

    return storage;
};

function getStorage(model) {
    return {
        get: function(id, cb) {
            model.findOne({
                id: id
            }).lean().exec(cb);
        },
        save: function(data, cb) {
            model.findOneAndUpdate({
                id: data.id
            }, data, {
                upsert: true,
                new: true
            }).lean().exec(cb);
        },
        delete: function(id, cb) {
            model.delete({
                id: id
            }).lean().exec(cb)
        },
        all: function(cb) {
            model.find({}).lean().exec(cb);
        }
    };
}
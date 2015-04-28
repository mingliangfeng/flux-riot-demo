Dispatcher = require('flux-riot').Dispatcher

module.exports =
  dispatchViewAction: (type, data)->
    Dispatcher.handleViewAction
      type: type
      data: data

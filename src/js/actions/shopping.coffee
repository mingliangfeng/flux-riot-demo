dispatch = require('../dispatcher/dispatcher.coffee').dispatchViewAction
ActionTypes = require('../constants/app_constants.coffee').ActionTypes

module.exports =
  add2Cart: (product) ->
    dispatch ActionTypes.SHOPPING_ADD_2_CART, product

  checkout: ->
    dispatch ActionTypes.SHOPPING_CHECKOUT

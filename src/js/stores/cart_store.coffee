assign = require 'object-assign'
Dispatcher = require('flux-riot').Dispatcher
ActionTypes = require('../constants/app_constants.coffee').ActionTypes
BaseStore = require('flux-riot').BaseStore

# cart storage
_items = { }

API =
  getItems: -> _items
  clearItems: -> _items = { }

# CartStore
CartStore = assign new BaseStore(),
  getAll: -> API.getItems()
  clearCart: -> API.clearItems()

  dispatchToken: Dispatcher.register (payload)->
    action = payload.action
    switch action.type
      when ActionTypes.SHOPPING_ADD_2_CART
        product = action.data
        all_items = CartStore.getAll()
        if product.id of all_items
          all_items[product.id].quantity += 1
        else
          all_items[product.id] = { title: product.title, price: product.price, quantity: 1 }

        CartStore.emitChange()
      when ActionTypes.SHOPPING_CHECKOUT
        CartStore.clearCart()
        CartStore.emitChange()

module.exports = CartStore

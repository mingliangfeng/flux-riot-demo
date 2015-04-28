assign = require 'object-assign'
Dispatcher = require('flux-riot').Dispatcher
ActionTypes = require('../constants/app_constants.coffee').ActionTypes
BaseStore = require('flux-riot').BaseStore

# products storage
gid = 1
_products = [ ]

API =
  getProducts: -> _products
  initProducts: ->
    _products = [
      { id: gid++, title: 'iPad 4 Mini', image: 'ipad-mini.png', price: 500.01, quantity: 10 },
      { id: gid++, title: 'H&M T-Shirt White', image: 't-shirt.png', price: 10.99, quantity: 1 },
      { id: gid++, title: 'Charli XCX - Sucker CD', image: 'sucker.png', price: 19.99, quantity: 5 }
    ]

API.initProducts()

# ProductStore
ProductStore = assign new BaseStore(),
  getAll: -> API.getProducts()

  getProduct: (id)->
    for product in ProductStore.getAll()
      return product if product.id == parseInt(id)

  dispatchToken: Dispatcher.register (payload)->
    action = payload.action
    switch action.type
      when ActionTypes.SHOPPING_ADD_2_CART
        product = action.data
        product.quantity = product.quantity - 1
        ProductStore.emitChange() if product.quantity <= 0
      when ActionTypes.SHOPPING_CHECKOUT
        API.initProducts()

module.exports = ProductStore

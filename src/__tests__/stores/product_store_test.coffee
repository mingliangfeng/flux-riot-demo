helper = require '../support/helper.coffee'
helper.dontMock 'stores/product_store.coffee'
ActionSources = require('flux-riot').Constants.ActionSources
ActionTypes = helper.require_src('constants/app_constants.coffee').ActionTypes

describe 'product_store', ->
  Dispatcher = product_store = null

  beforeEach ->
    Dispatcher = require('flux-riot').Dispatcher

  it 'rigster a callback', ->
    spyOn Dispatcher, 'register'
    product_store = helper.require_src 'stores/product_store.coffee'
    expect(Dispatcher.register).toHaveBeenCalled()

  describe 'after register', ->
    beforeEach ->
      product_store = helper.require_src 'stores/product_store.coffee'

    it 'initialize store with 3 products', ->
      products = product_store.getAll()
      expect(products.length).toBe 3

    it 'add2Cart', ->
      spyOn product_store, 'emitChange'
      add2CartAction =
        source: ActionSources.VIEW_ACTION
        action:
          type: ActionTypes.SHOPPING_ADD_2_CART
          data: { quantity: 2 }

      Dispatcher.dispatch add2CartAction
      expect(add2CartAction.action.data.quantity).toBe 1
      expect(product_store.emitChange).not.toHaveBeenCalled()

      Dispatcher.dispatch add2CartAction
      expect(add2CartAction.action.data.quantity).toBe 0
      expect(product_store.emitChange).toHaveBeenCalled()

    it 'checkout', ->
      checkoutAction =
        source: ActionSources.VIEW_ACTION
        action:
          type: ActionTypes.SHOPPING_CHECKOUT

      product = product_store.getAll()[0]
      expect(product.quantity).toBe 10
      product.quantity -= 1
      expect(product.quantity).toBe 9

      Dispatcher.dispatch checkoutAction

      product = product_store.getAll()[0]
      expect(product.quantity).toBe 10

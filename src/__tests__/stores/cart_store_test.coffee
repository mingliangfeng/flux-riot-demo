helper = require '../support/helper.coffee'
helper.dontMock 'stores/cart_store.coffee'
ActionSources = require('flux-riot').Constants.ActionSources
ActionTypes = helper.require_src('constants/app_constants.coffee').ActionTypes

describe 'cart_store', ->
  Dispatcher = cart_store = null

  beforeEach ->
    Dispatcher = require('flux-riot').Dispatcher

  it 'rigster a callback', ->
    spyOn Dispatcher, 'register'
    cart_store = helper.require_src 'stores/cart_store.coffee'
    expect(Dispatcher.register).toHaveBeenCalled()

  describe 'after register', ->
    beforeEach ->
      cart_store = helper.require_src 'stores/cart_store.coffee'

    it 'initialize store with empty hash', ->
      items = cart_store.getAll()
      expect(items).toEqual {}

    it 'add2Cart', ->
      spyOn cart_store, 'emitChange'
      add2CartAction =
        source: ActionSources.VIEW_ACTION
        action:
          type: ActionTypes.SHOPPING_ADD_2_CART
          data: { id: 1 }

      Dispatcher.dispatch add2CartAction

      items = cart_store.getAll()
      expect(items[1].quantity).toBe 1
      expect(cart_store.emitChange).toHaveBeenCalled()

      Dispatcher.dispatch add2CartAction
      expect(items[1].quantity).toBe 2
      expect(cart_store.emitChange).toHaveBeenCalled()

    it 'checkout', ->
      spyOn cart_store, 'emitChange'
      checkoutAction =
        source: ActionSources.VIEW_ACTION
        action:
          type: ActionTypes.SHOPPING_CHECKOUT

      data = { quantity: 5 }
      items = cart_store.getAll()
      items[0] = data
      expect(items).toEqual { 0: data }

      Dispatcher.dispatch checkoutAction

      items = cart_store.getAll()
      expect(items).toEqual {}
      expect(cart_store.emitChange).toHaveBeenCalled()

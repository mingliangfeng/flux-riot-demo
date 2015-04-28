helper = require '../support/helper.coffee'
helper.dontMock 'actions/shopping.coffee'

ActionTypes = helper.require_src('constants/app_constants.coffee').ActionTypes

describe 'shopping', ->
  Dispatcher = shopping = null

  callback = -> Dispatcher.handleViewAction.mock.calls
  params = -> callback()[0][0]

  beforeEach ->
    Dispatcher = helper.require_src 'dispatcher/dispatcher.coffee'
    spyOn Dispatcher, 'dispatchViewAction'
    shopping = helper.require_src 'actions/shopping.coffee'

  it 'add2Cart', ->
    shopping.add2Cart title: 'product'
    expect(Dispatcher.dispatchViewAction).toHaveBeenCalledWith ActionTypes.SHOPPING_ADD_2_CART,
      title: 'product'

  it 'checkout', ->
    shopping.checkout()
    expect(Dispatcher.dispatchViewAction).toHaveBeenCalledWith ActionTypes.SHOPPING_CHECKOUT

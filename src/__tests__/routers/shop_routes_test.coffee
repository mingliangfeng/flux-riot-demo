helper = require '../support/helper.coffee'
helper.dontMock 'routers/shop_routes.coffee'

riot = require 'riot/riot'

describe 'shop_routes', ->
  shop_presenter = shop_routes = null

  beforeEach ->
    shop_routes = helper.require_src 'routers/shop_routes.coffee'
    shop_presenter = helper.require_src 'presenters/shop_presenter.coffee'

  it 'root routes', ->
    shop_routes.start ''
    expect(shop_presenter.showStore.mock.calls.length).toBe 1

  # as jest mocks setTimeout, have to use runs / waitsFor
  # see http://jasmine.github.io/1.3/introduction.html#section-Asynchronous_Support
  it 'checkout', ->
    runs ->
      riot.route 'checkout'

    waitsFor ->
      return shop_presenter.checkout.mock.calls.length == 1
    , 'shop_presenter checkout to be called', 1000

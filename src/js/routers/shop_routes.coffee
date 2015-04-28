riot = require 'riot/riot'
BaseRouter = require('flux-riot').BaseRouter
shop_presenter = require '../presenters/shop_presenter.coffee'

BaseRouter.routes shop_presenter.showStore,
  'checkout', shop_presenter.checkout

module.exports =
  start: BaseRouter.start

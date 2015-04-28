riot = require 'riot/riot'
require '../components/app.tag'
require '../components/checkout.tag'

app_tag = null

unmount = -> app_tag.unmount(true) if app_tag
mount = (tag, opts)-> riot.mount('#app-container', tag, opts)[0]

module.exports =
  showStore: ->
    unmount()
    app_tag = mount 'app'

  checkout: ->
    unmount()
    app_tag = mount 'checkout'

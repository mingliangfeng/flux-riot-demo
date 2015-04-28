require('./cart/cart.tag')
require('./product/shop.tag')
product_store = require('../stores/product_store.coffee')
var flux_riot = require('flux-riot')

<app>
  <div class="pure-g">
    <div class="pure-u-1 pure-u-sm-3-5 list-grid">
      <h1>flux-riot Shop Demo</h1>
      <shop></shop>
    </div>
    <div class="pure-u-1 pure-u-sm-2-5 cart-grid">
      <cart></cart>
    </div>
  </div>
</app>

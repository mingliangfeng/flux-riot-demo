require('./item_list.tag')
var flux_riot = require('flux-riot')
Currencies = require('../../constants/app_constants.coffee').Currencies
var cart_store = require('../../stores/cart_store.coffee')

<cart>
  <div class="cart">
    <h2>Your Cart</h2>
    <div class="uk-margin-small-bottom" if={ !items.length }>
      Please add some products to cart.
    </div>
    <item-list items={ items }></item-list>
    <div>Total: <span>{ Currencies.POUND }<strong>{ totalPrice() }</strong></span></div>
    <div class="text-right">
      <button class={ 'pure-button': true, 'btn-checkout': true, 'pure-button-disabled': items.length <= 0}  onclick={ checkout }>Checkout</button>
    </div>
  </div>

  checkout() {
    riot.route('checkout')
  }

  totalPrice() {
    var totalPrice = 0.0
    this.items.forEach(function(item) {
      totalPrice += item.price * item.quantity
    })
    return totalPrice.toFixed(2)
  }

  getDataFromStore() {
    var all_items = cart_store.getAll()
    this.items = Object.keys(all_items).map(function(key) {
      return all_items[key]
    })
  }

  updateFromStore() {
    this.getDataFromStore()
    this.update()
  }

  flux_riot.storeMixin(this, cart_store, this.updateFromStore)

  this.getDataFromStore()
</cart>

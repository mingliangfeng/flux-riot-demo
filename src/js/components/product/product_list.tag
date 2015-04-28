Currencies = require('../../constants/app_constants.coffee').Currencies
var shopping = require('../../actions/shopping.coffee')

<product-list>
  <div>
    <div class="product" each={ opts.items }>
      <img class="product-img" riot-src="images/{ image }"></img>
      <div class="product-desc">
        <h3>{ title } - { Currencies.POUND }{ price }</h3>
        <button class={ 'pure-button': true, 'pure-button-primary': true, 'pure-button-disabled': quantity <= 0}  onclick={ parent.add2Cart }>Add to cart</button>
      </div>
      <div class="clearfix"></div>
    </div>
  </div>

  add2Cart(e) {
    if (e.item.quantity > 0) shopping.add2Cart(e.item)
  }
</product-list>

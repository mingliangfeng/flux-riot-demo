require('./common/animation_dots.tag')
var shopping = require('../actions/shopping.coffee')

<checkout>
  <div class="checkout">
    <h1>Checkout <strong>{ this.checkoutTime }</strong><animation-dots></animation-dots></h1>
  </div>

  this.checkoutTime = 3

  checkout() {
    if (this.checkoutTime <= 0) {
      shopping.checkout()
      riot.route('#')
    } else {
      this.checkoutTime -= 1
      this.update()
      this.setTimer()
    }
  }

  setTimer() {
    this.timer = setTimeout(this.checkout, 1000)
  }

  clearTimer() {
    clearTimeout(this.timer)
  }

  this.on('mount', this.setTimer)
  this.on('unmount', this.clearTimer)
</checkout>

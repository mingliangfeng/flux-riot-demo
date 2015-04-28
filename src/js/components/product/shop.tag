require('./product_list.tag')
product_store = require('../../stores/product_store.coffee')
var flux_riot = require('flux-riot')

<shop>
  <product-list items={ products }></product-list>

  getDataFromStore() {
    this.products = product_store.getAll()
  }

  updateFromStore() {
    this.getDataFromStore()
    this.update()
  }

  flux_riot.storeMixin(this, product_store, this.updateFromStore)

  this.getDataFromStore()

</shop>

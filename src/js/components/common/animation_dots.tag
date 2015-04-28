<animation-dots>
  <span>{ Array(dotsCount + 1).join(".") }</span>

  this.dotsCount = 1
  this.timeout = opts.timeout || 200

  changeDots() {
    this.dotsCount = (this.dotsCount + 1) % 10
    this.setTimer()
    this.update()
  }

  setTimer() {
    this.timer = setTimeout(this.changeDots, this.timeout)
  }

  clearTimer() {
    clearTimeout(this.timer)
  }

  this.on('mount', this.setTimer)
  this.on('unmount', this.clearTimer)

</animation-dots>
